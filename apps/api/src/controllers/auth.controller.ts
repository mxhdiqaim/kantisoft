/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { eq, or } from "drizzle-orm";
import { handleError2 } from "../service/error-handling";
import db from "../shared/database";
import { users } from "../schema/users-schema";
import { stores } from "../schema/stores-schema";
import { formatPhoneNumber } from "../shared/utils/format-phone-number";
import { getFirebaseAdmin } from "../config/firebase-admin";
import { emailService } from "../service/email.service";
import { ActivityLogService } from "../service/activity-service-log";
import {
    ActivityEntityTypeEnum,
    UserRoleEnum,
    UserStatusEnum,
} from "../types/enums";

/**
 * @desc    Verify Firebase ID Token and return local Postgres Profile
 * @route   POST /auth
 * @access  Public (Expects Bearer Token)
 */
export const auth = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return handleError2(
                res,
                "Authentication failed: Missing or malformed token.",
                StatusCodes.UNAUTHORIZED,
            );
        }

        const token = authHeader.split(" ")[1];
        const admin = getFirebaseAdmin();
        let decodedToken;

        try {
            decodedToken = await admin.auth().verifyIdToken(token);
        } catch (error) {
            ActivityLogService.logSystemEvent({
                userId: null as unknown as string,
                storeId: null as unknown as string,
                entityId: "AUTH_FAILURE",
                entityType: ActivityEntityTypeEnum.USER,
                action: "USER_LOGIN_FAILED",
                actorName: "Unknown",
                targetName: "Unknown",
                details: `Failed login attempt. Reason: Invalid or expired Firebase token. IP: ${req.ip}`,
            }).catch((err) => console.error("Logging failed", err));

            return handleError2(
                res,
                "Authentication failed: Invalid token.",
                StatusCodes.UNAUTHORIZED,
                error instanceof Error ? error : undefined,
            );
        }

        const { uid, email } = decodedToken;

        if (!decodedToken.email_verified) {
            return handleError2(
                res,
                "Please verify your email address before logging in.",
                StatusCodes.FORBIDDEN,
            );
        }

        // Fetch profile with relational join automatically handled by Drizzle
        let userRecord = await db.query.users.findFirst({
            where: eq(users.firebaseUid, uid),
            with: { store: true },
        });

        // Migration Bridge for legacy users matching by email
        if (!userRecord && email) {
            userRecord = await db.query.users.findFirst({
                where: eq(users.email, String(email)),
                with: { store: true },
            });

            if (userRecord && !userRecord.firebaseUid) {
                await db
                    .update(users)
                    .set({ firebaseUid: uid })
                    .where(eq(users.id, userRecord.id));

                userRecord.firebaseUid = uid;
            }
        }

        if (!userRecord) {
            return handleError2(
                res,
                "Access denied. Account unregistered.",
                StatusCodes.UNAUTHORIZED,
            );
        }

        // Enforce Account Status Restrictions
        if (
            userRecord.status === UserStatusEnum.DELETED ||
            userRecord.status === UserStatusEnum.BANNED ||
            userRecord.status === UserStatusEnum.INACTIVE
        ) {
            ActivityLogService.logSystemEvent({
                userId: userRecord.id,
                storeId: userRecord.storeId || null,
                entityId: userRecord.id,
                entityType: ActivityEntityTypeEnum.USER,
                action: "USER_LOGIN_FAILED",
                actorName: `${userRecord.firstName} ${userRecord.lastName}`,
                targetName: userRecord.email,
                details: `Login blocked for ${userRecord.email}. Account status is ${userRecord.status}.`,
            }).catch((err) => console.error("Logging failed", err));

            return handleError2(
                res,
                `Access denied. Your account status is marked as ${userRecord.status}.`,
                StatusCodes.FORBIDDEN,
            );
        }

        // Log Successful Authentication
        await ActivityLogService.logSystemEvent({
            userId: userRecord.id,
            storeId: String(userRecord.storeId),
            entityId: userRecord.id,
            entityType: ActivityEntityTypeEnum.USER,
            action: "USER_LOGIN",
            actorName: `${userRecord.firstName} ${userRecord.lastName}`,
            targetName: userRecord.email,
            details: `User logged in successfully. IP: ${req.ip}`,
            isRead: false,
        }).catch((err) => console.error("Logging success failed", err));

        return res.status(StatusCodes.OK).json({
            token: token,
            user: userRecord,
        });
    } catch (error) {
        return handleError2(
            res,
            "Server error during authentication",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @desc    Register a new Manager and their first Store
 * @route   POST /auth/signup
 * @access  Public
 */
export const signup = async (req: Request, res: Response) => {
    let createdFirebaseUid: string | null = null;
    const admin = getFirebaseAdmin();

    try {
        const {
            firstName,
            lastName,
            email,
            password,
            phone,
            storeName,
            storeType,
        } = req.body;

        if (
            !email ||
            !password ||
            !firstName ||
            !lastName ||
            !storeName ||
            !storeType
        ) {
            return handleError2(
                res,
                "First name, last name, email, password, store name, and store type are required.",
                StatusCodes.BAD_REQUEST,
            );
        }

        const lowercasedEmail = email.toLowerCase();
        const formattedPhone = formatPhoneNumber(phone);

        if (!formattedPhone) {
            return handleError2(
                res,
                "Invalid phone number format. Please provide a valid number.",
                StatusCodes.BAD_REQUEST,
            );
        }

        const existingUser = await db.query.users.findFirst({
            where: or(
                eq(users.email, lowercasedEmail),
                eq(users.phone, formattedPhone),
            ),
        });

        if (existingUser) {
            const conflictField =
                existingUser.email === lowercasedEmail
                    ? "Email"
                    : "Phone number";
            return handleError2(
                res,
                `${conflictField} already exists.`,
                StatusCodes.CONFLICT,
            );
        }

        const firebaseUser = await admin.auth().createUser({
            email: lowercasedEmail,
            password: password,
            displayName: `${firstName} ${lastName}`,
            emailVerified: false,
        });

        createdFirebaseUid = firebaseUser.uid;

        const { user } = await db.transaction(async (tx) => {
            const [newStore] = await tx
                .insert(stores)
                .values({ name: storeName, storeType })
                .returning();

            const [user] = await tx
                .insert(users)
                .values({
                    firebaseUid: firebaseUser.uid,
                    firstName,
                    lastName,
                    email: lowercasedEmail,
                    phone: formattedPhone,
                    role: UserRoleEnum.MANAGER,
                    status: UserStatusEnum.ACTIVE,
                    storeId: newStore.id,
                })
                .returning();

            return { user };
        });

        await ActivityLogService.logSystemEvent({
            userId: user.id,
            storeId: String(user.storeId),
            action: "MANAGER_REGISTERED",
            entityId: user.id,
            entityType: ActivityEntityTypeEnum.USER,
            actorName: `${user.firstName} ${user.lastName}`,
            targetName: `${user.firstName} ${user.lastName}`,
            details: `Manager ${user.firstName} ${user.lastName} registered and created store.`,
        });

        const verificationLink = await admin
            .auth()
            .generateEmailVerificationLink(lowercasedEmail);

        try {
            await emailService.sendVerificationEmail({
                to: lowercasedEmail,
                firstName,
                verificationLink,
            });
            console.log(
                `📧 Verification email successfully sent to ${lowercasedEmail}`,
            );
        } catch (emailError) {
            console.error("Failed to send verification email:", emailError);
        }

        return res.status(StatusCodes.CREATED).json({
            message:
                "Account created successfully. Please check your email to verify your account before logging in.",
        });
    } catch (error: any) {
        if (createdFirebaseUid) {
            try {
                await admin.auth().deleteUser(createdFirebaseUid);
                console.log(
                    `🧹 Rolled back Firebase user ${createdFirebaseUid} due to database failure.`,
                );
            } catch (cleanupError) {
                console.error(
                    "CRITICAL: Failed to clean up Firebase user:",
                    cleanupError,
                );
            }
        }

        if (error.cause?.code === "23505" && error.cause?.constraint) {
            const conflictMsg = error.cause.constraint.includes(
                "users_email_unique",
            )
                ? "A user with this email already exists."
                : "A user with this phone number already exists.";
            return handleError2(res, conflictMsg, StatusCodes.CONFLICT, error);
        }

        return handleError2(
            res,
            "Registration failed. Please try again.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @desc    Resend the email verification link to an unverified user
 * @route   POST /auth/resend-verification
 * @access  Public
 */
export const resendVerification = async (req: Request, res: Response) => {
    try {
        const { identifier } = req.body;

        if (!identifier) {
            return handleError2(
                res,
                "Please provide your email or phone number.",
                StatusCodes.BAD_REQUEST,
            );
        }

        let targetEmail = "";
        let dbUserRecord;

        if (identifier.includes("@")) {
            targetEmail = identifier.toLowerCase();
            dbUserRecord = await db.query.users.findFirst({
                where: eq(users.email, targetEmail),
            });
        } else {
            const formattedPhone = formatPhoneNumber(identifier);
            if (!formattedPhone) {
                return handleError2(
                    res,
                    "Invalid phone number format.",
                    StatusCodes.BAD_REQUEST,
                );
            }

            dbUserRecord = await db.query.users.findFirst({
                where: eq(users.phone, formattedPhone),
            });

            if (dbUserRecord) {
                targetEmail = dbUserRecord.email;
            }
        }

        if (!dbUserRecord || !targetEmail) {
            return res.status(StatusCodes.OK).json({
                message:
                    "If an account matches that identifier, a new verification link has been sent.",
            });
        }

        const admin = getFirebaseAdmin();
        let firebaseUser;
        try {
            firebaseUser = await admin.auth().getUserByEmail(targetEmail);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            return res.status(StatusCodes.OK).json({
                message:
                    "If an account matches that identifier, a new verification link has been sent.",
            });
        }

        if (firebaseUser.emailVerified) {
            return handleError2(
                res,
                "This account is already verified. You can proceed to log in.",
                StatusCodes.CONFLICT,
            );
        }

        const verificationLink = await admin
            .auth()
            .generateEmailVerificationLink(targetEmail);

        try {
            await emailService.sendVerificationEmail({
                to: targetEmail,
                firstName: dbUserRecord.firstName,
                verificationLink,
            });
            console.log(`📧 Resent verification email to ${targetEmail}`);
        } catch (error) {
            return handleError2(
                res,
                "We encountered an issue sending the email. Please try again later.",
                StatusCodes.INTERNAL_SERVER_ERROR,
                error instanceof Error ? error : undefined,
            );
        }

        return res.status(StatusCodes.OK).json({
            message:
                "A new verification link has been sent to your email address.",
        });
    } catch (error) {
        return handleError2(
            res,
            "Server error while processing your request.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @desc    Initiate a password reset flow (sends email)
 * @route   POST /auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { identifier } = req.body;

        if (!identifier) {
            return handleError2(
                res,
                "Please provide your email or phone number.",
                StatusCodes.BAD_REQUEST,
            );
        }

        let targetEmail = "";
        let dbUserRecord;

        if (identifier.includes("@")) {
            targetEmail = identifier.toLowerCase();
            dbUserRecord = await db.query.users.findFirst({
                where: eq(users.email, targetEmail),
            });
        } else {
            const formattedPhone = formatPhoneNumber(identifier);
            if (!formattedPhone) {
                return handleError2(
                    res,
                    "Invalid phone number format.",
                    StatusCodes.BAD_REQUEST,
                );
            }

            dbUserRecord = await db.query.users.findFirst({
                where: eq(users.phone, formattedPhone),
            });

            if (dbUserRecord) {
                targetEmail = dbUserRecord.email;
            }
        }

        if (
            !dbUserRecord ||
            !targetEmail ||
            dbUserRecord.status === UserStatusEnum.DELETED ||
            dbUserRecord.status === UserStatusEnum.BANNED
        ) {
            return res.status(StatusCodes.OK).json({
                message:
                    "If an account matches that identifier, a password reset link has been sent.",
            });
        }

        const admin = getFirebaseAdmin();
        let resetLink;
        try {
            resetLink = await admin
                .auth()
                .generatePasswordResetLink(targetEmail);
        } catch (error) {
            console.error("Firebase reset link generation failed:", error);
            return res.status(StatusCodes.OK).json({
                message:
                    "If an account matches that identifier, a password reset link has been sent.",
            });
        }

        try {
            await emailService.sendPasswordResetEmail({
                to: targetEmail,
                firstName: dbUserRecord.firstName,
                resetLink,
            });
            console.log(`🔐 Password reset email sent to ${targetEmail}`);
        } catch (error) {
            return handleError2(
                res,
                "We encountered an issue sending the email. Please try again later.",
                StatusCodes.INTERNAL_SERVER_ERROR,
                error instanceof Error ? error : undefined,
            );
        }

        return res.status(StatusCodes.OK).json({
            message:
                "If an account matches that identifier, a password reset link has been sent.",
        });
    } catch (error) {
        return handleError2(
            res,
            "Server error while processing your request.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @desc    Terminate active session
 * @route   POST /auth/signout
 * @access  Protected
 */
export const signout = async (req: Request, res: Response) => {
    return res.status(StatusCodes.OK).json({ message: "Logout successful" });
};
