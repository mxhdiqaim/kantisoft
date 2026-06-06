/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { eq, or } from "drizzle-orm";
import { handleError2 } from "../service/error-handling";
import db from "../db";
import { users } from "../schema/users-schema";
import { formatPhoneNumber } from "../utils/format-phone-number";
import { getFirebaseAdmin } from "../config/firebase-admin";
import { emailService } from "../service/email.service";
import { stores } from "../schema/stores-schema";
import { ActivityLogService } from "../service/activity-service-log";
import {
    ActivityEntityTypeEnum,
    UserRoleEnum,
    UserStatusEnum,
} from "../types/enums";

export const signup = async (req: Request, res: Response) => {
    // Keep track of the Firebase UID in case we need to roll back
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

        // Validate input
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

        // Format and Validate Phone Number
        const formattedPhone = formatPhoneNumber(phone);

        if (!formattedPhone) {
            return handleError2(
                res,
                "Invalid phone number format. Please provide a valid number.",
                StatusCodes.BAD_REQUEST,
            );
        }

        // Database Existence Check (Check both email and formatted phone simultaneously)
        const existingUser = await db.query.users.findFirst({
            where: or(
                eq(users.email, lowercasedEmail),
                eq(users.phone, formattedPhone),
            ),
        });

        if (existingUser) {
            if (existingUser.email === lowercasedEmail) {
                return handleError2(
                    res,
                    "Email already exists.",
                    StatusCodes.CONFLICT,
                );
            }
            if (existingUser.phone === formattedPhone) {
                return handleError2(
                    res,
                    "Phone number already exists.",
                    StatusCodes.CONFLICT,
                );
            }
        }

        // Create the user in Firebase Auth
        const firebaseUser = await admin.auth().createUser({
            email: lowercasedEmail,
            password: password,
            displayName: `${firstName} ${lastName}`,
            emailVerified: false,
        });

        createdFirebaseUid = firebaseUser.uid;

        // Use a transaction to ensure both user and store are created, or neither.
        const { user } = await db.transaction(async (tx) => {
            // Create the store first
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
                    // TODO User Role will change to ADMIN as we will swap ADMIN & MANAGER
                    role: UserRoleEnum.MANAGER,
                    status: UserStatusEnum.ACTIVE,
                    storeId: newStore.id,
                })
                .returning();

            return { user };
        });

        // Log activity for manager registration
        await ActivityLogService.logSystemEvent({
            userId: user.id,
            storeId: String(user.storeId),
            // TODO User Role will change to ADMIN as we will swap ADMIN & MANAGER
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

        res.status(StatusCodes.CREATED).json({
            message:
                "Account created successfully. Please check your email to verify your account before logging in.",
        });
    } catch (error: any) {
        // 🚨 AUTOMATED ROLLBACK: Prevent the "Ghost User"
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

        // Handle PostgreSQL unique constraint violations
        if (
            error.cause &&
            typeof error.cause === "object" &&
            "code" in error.cause &&
            error.cause.code === "23505"
        ) {
            if ("constraint" in error.cause) {
                if (error.cause.constraint.includes("users_email_unique")) {
                    return handleError2(
                        res,
                        "A user with this email already exists.",
                        StatusCodes.CONFLICT,
                        error,
                    );
                }
                if (error.cause.constraint.includes("users_phone_unique")) {
                    return handleError2(
                        res,
                        "A user with this phone number already exists.",
                        StatusCodes.CONFLICT,
                        error,
                    );
                }
            }
        }

        return handleError2(
            res,
            "Registration failed. Please try again.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

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

        // Verify the Firebase Token
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

        // Enforce Email Verification Gate
        if (!decodedToken.email_verified) {
            return handleError2(
                res,
                "Please verify your email address before logging in.",
                StatusCodes.FORBIDDEN,
            );
        }

        // Fetch user dynamically by firebaseUid using elegant relational queries
        let userRecord = await db.query.users.findFirst({
            where: eq(users.firebaseUid, uid),
            with: {
                store: true,
            },
        });

        // Migration Bridge for legacy users matching by email
        if (!userRecord && email) {
            userRecord = await db.query.users.findFirst({
                where: eq(users.email, String(email)),
                with: { store: true },
            });

            // If found by email, link their account by backfilling the firebaseUid
            if (userRecord && !userRecord.firebaseUid) {
                await db
                    .update(users)
                    .set({ firebaseUid: uid })
                    .where(eq(users.id, userRecord.id));

                userRecord.firebaseUid = uid;
            }
        }

        // Handle Completely Unregistered Accounts
        if (!userRecord) {
            return handleError2(
                res,
                "Access denied. Account unregistered.",
                StatusCodes.UNAUTHORIZED,
            );
        }

        // Handle Account Status Restrictions (Banned, Deleted, Inactive)
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

        // Log Successful Login
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

        // Return the Profile and Token back to RTK Query
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

        // Resolve Identifier (Is it an email or a phone number?)
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
            // User exists in Postgres but not Firebase (Edge case / Ghost user)
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

        // Resolve Identifier (Email or Phone)
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

        // Generate the Password Reset Link via Firebase Admin
        const admin = getFirebaseAdmin();

        let resetLink;
        try {
            // TODO: Implement custom UI not use firebase UI.
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

        // Respond to Client
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

export const signout = async (req: Request, res: Response) => {
    return res.status(StatusCodes.OK).json({ message: "Logout successful" });
};
