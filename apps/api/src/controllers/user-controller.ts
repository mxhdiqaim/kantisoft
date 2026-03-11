/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, desc, eq, gte, inArray, lte, ne, or, sql, SQL } from "drizzle-orm";
import { NextFunction, Request, Response } from "express";
import passport from "passport";
import { generateToken } from "../config/jwt-config";
import db from "../db";
import { InsertUserSchemaT, users, UserSchemaT } from "../schema/users-schema";
import { handleError2 } from "../service/error-handling";
import { passwordHashService } from "../service/password-hash-service";
import { ActivityEntityTypeEnum, UserRoleEnum, UserStatusEnum } from "../types/enums";
import { stores } from "../schema/stores-schema";
import { CustomRequest } from "../types/express";
import { StatusCodes } from "http-status-codes";
import { validateStoreAndExtractDates } from "../utils/validate-store-dates";
import { getUserStoreScope } from "../utils/get-store-scope";
import { ActivityLogService } from "../service/activity-service-log";
import { activityLog } from "../schema/activity-log-schema";

/**
 * @desc    Register a new Manager and their first Store
 * @route   POST /api/register
 * @access  Public
 */
export const registerManagerAndStore = async (req: Request, res: Response) => {
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
        if (!email || !password || !firstName || !storeName || !storeType) {
            return handleError2(
                res,
                "First name, email, password, store name, and store type are required.",
                StatusCodes.BAD_REQUEST,
            );
        }

        const lowercasedEmail = email.toLowerCase();

        // Normalise phone input: Convert empty string or undefined to null
        // This ensures consistent storage (NULL for truly optional/blank) and
        // allows correct SQL NULL handling in uniqueness checks.
        const normalizedPhone =
            phone === "" || phone === undefined ? null : phone;

        // Build the base condition (email is always checked)
        let whereConditions: SQL<unknown> | undefined = eq(users.email, email);

        // If a non-null phone number is provided, combine with the email condition using 'or'
        if (normalizedPhone !== null) {
            whereConditions = or(
                whereConditions,
                eq(users.phone, normalizedPhone),
            );
        }

        // Check for existing user with either the email OR the provided (non-null) phone
        // This check is global, as this controller creates the first manager/store
        const existingUser = await db.query.users.findFirst({
            where: whereConditions,
        });

        if (existingUser) {
            // Provide more specific feedback to the user
            if (existingUser.email.toLowerCase() === lowercasedEmail) {
                return handleError2(
                    res,
                    "A user with this email already exists.",
                    StatusCodes.CONFLICT,
                );
            } else if (
                normalizedPhone !== null &&
                existingUser.phone === normalizedPhone
            ) {
                return handleError2(
                    res,
                    "A user with this phone number already exists.",
                    StatusCodes.CONFLICT,
                );
            } else {
                // Fallback for general case or if both match (less likely with specific checks above)
                return handleError2(
                    res,
                    "A user with this email or phone number already exists.",
                    StatusCodes.CONFLICT,
                );
            }
        }

        // Use a transaction to ensure both user and store are created, or neither.
        const { user, token } = await db.transaction(async (tx) => {
            // Create the store first
            const [newStore] = await tx
                .insert(stores)
                .values({ name: storeName, storeType })
                .returning();

            // Then create the user, assigning them the manager role and linking the new store
            const hashedPassword = await passwordHashService.hash(password);
            const [newUser] = await tx
                .insert(users)
                .values({
                    firstName,
                    lastName,
                    email: lowercasedEmail,
                    password: hashedPassword,
                    phone: normalizedPhone,
                    role: UserRoleEnum.MANAGER, // Automatically a manager
                    status: UserStatusEnum.ACTIVE,
                    storeId: newStore.id, // Link to the new store
                })
                .returning();

            // Generate a token for the new user
            const token = generateToken(newUser);

            return { user: newUser, token };
        });

        // Log activity for manager registration
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

        // Return the new user (without password) and the token
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...userWithoutPassword } = user;

        res.status(StatusCodes.CREATED).json({
            user: userWithoutPassword,
            token,
        });
    } catch (error: any) {
        // console.error("Registration Error:", error);
        // CRITICAL FIX: Add more specific error handling for unique constraints.
        // If the database constraint (e.g. users_storeId_phone_unique) is violated,
        // Drizzle might throw an error with a specific code/constraint name.
        if (
            error.cause &&
            typeof error.cause === "object" &&
            "code" in error.cause &&
            error.cause.code === "23505" // PostgreSQL unique violation
        ) {
            if ("constraint" in error.cause) {
                switch (error.cause.constraint) {
                    case "users_email_global_unique":
                        return handleError2(
                            res,
                            "A user with this email already exists.",
                            StatusCodes.CONFLICT,
                            error instanceof Error ? error : undefined,
                        );
                    case "users_phone_global_unique":
                        return handleError2(
                            res,
                            "A user with this phone number already exists.",
                            StatusCodes.CONFLICT,
                            error instanceof Error ? error : undefined,
                        );
                }
            }
        }

        handleError2(
            res,
            "Registration failed. Please try again.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @desc    Get all users (Admin only)
 * @route   GET /api/v1/users
 * @access  Private Managers | Admins
 *          Managers can see all users in their store, Admins can on only the users in their store
 */
export const getAllUsers = async (req: CustomRequest, res: Response) => {
    try {
        const validated = await validateStoreAndExtractDates(req, res);
        if (!validated) return;

        const { storeIds } = validated;

        // Fetch all users from the collected store IDs
        const allUsers = await db
            .select({
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email,
                phone: users.phone,
                role: users.role,
                status: users.status,
                storeId: stores.id,
                createdAt: users.createdAt,
                lastModified: users.lastModified,
                store: {
                    id: stores.id,
                    name: stores.name,
                    location: stores.location,
                },
            })
            .from(users)
            .leftJoin(stores, eq(users.storeId, stores.id))
            .where(
                and(
                    inArray(users.storeId, storeIds),
                    ne(users.status, UserStatusEnum.DELETED)
                )
            ).orderBy(stores.name, users.firstName);

        res.status(StatusCodes.OK).json(allUsers);

    } catch (error) {
        // console.error("Error fetching all users:", error);
        return handleError2(
            res,
            "Failed to fetch users.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @desc    Get a single user by their ID
 * @route   GET /users/:id
 * @access  Private (Manager, Admin of the same store, or the user themselves)
 */
export const getUserById = async (req: CustomRequest, res: Response) => {
    try {
        const currentUser = req.user?.data;
        const storeId = currentUser?.storeId;

        if(!storeId) {
            return handleError2(
                res,
                "Authenticated user is not associated with any store.",
                StatusCodes.FORBIDDEN,
            )
        }

        const validated = await validateStoreAndExtractDates(req, res);
        if (!validated) return;

        const { storeIds } = validated;
        const { id: targetUserId } = req.params;

        if (!targetUserId) {
            return handleError2(res, 'Missing user in request path.', StatusCodes.BAD_REQUEST);
        }

        if (typeof targetUserId !== "string") {
            return handleError2(
                res,
                "Invalid request user.",
                StatusCodes.BAD_REQUEST,
            )
        }

        // Fetch user with Store Join
        const [targetUser] = await db
            .select({
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email,
                phone: users.phone,
                role: users.role,
                status: users.status,
                storeId: users.storeId,
                createdAt: users.createdAt,
                lastModified: users.lastModified,
                store: {
                    id: stores.id,
                    name: stores.name,
                    location: stores.location,
                },
            })
            .from(users)
            .leftJoin(stores, eq(users.storeId, stores.id))
            .where(
                and(
                    eq(users.id, targetUserId),
                    inArray(users.storeId, storeIds),
                    ne(users.status, UserStatusEnum.DELETED)
                )
            );

        if (!targetUser) {
            return handleError2(
                res,
                "User not found or you do not have permission to view this profile.",
                StatusCodes.NOT_FOUND,
            );
        }

        // Authorisation Logic
        const isManager = currentUser.role === UserRoleEnum.MANAGER;
        const isOwnProfile = currentUser.id === targetUser.id;
        const isAdminInSameStore =
            currentUser.role === UserRoleEnum.ADMIN &&
            storeId === targetUser.storeId;

        // Deny access if none of the conditions are met
        if (!isManager && !isOwnProfile && !isAdminInSameStore) {
            return handleError2(
                res,
                "You do not have permission to view this profile.",
                StatusCodes.FORBIDDEN,
            );
        }

        res.status(StatusCodes.OK).json(targetUser);
    } catch (error) {
        handleError2(
            res,
            "Failed to fetch user.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @desc    Soft delete a user by setting their status to 'deleted'
 * @route   DELETE /users/:id
 * @access  Private (Manager or Admin)
 */
export const deleteUser = async (req: CustomRequest, res: Response) => {
    try {
        const currentUser = req.user?.data;

        // Check for authentication
        if (!currentUser) {
            return handleError2(
                res,
                "Authentication required.",
                StatusCodes.UNAUTHORIZED,
            );
        }

        const { id: targetUserId } = req.params;

        if (!targetUserId) {
            return handleError2(res, 'Missing user in request path.', StatusCodes.BAD_REQUEST);
        }

        if (typeof targetUserId !== "string") {
            return handleError2(
                res,
                "Invalid request user.",
                StatusCodes.BAD_REQUEST,
            )
        }

        // Prevent users from deleting themselves
        if (currentUser.id === targetUserId) {
            return handleError2(
                res,
                "You cannot perform this action",
                StatusCodes.FORBIDDEN,
            );
        }

        // Fetch the user to be deleted, but only if they are in the current user's store.
        const targetUser = await db.query.users.findFirst({
            where: and(
                eq(users.id, targetUserId),
                eq(users.storeId, String(currentUser.storeId)),
            ),
        });

        if (!targetUser) {
            return handleError2(
                res,
                "User not found.",
                StatusCodes.NOT_FOUND,
            );
        }

        // Authorisation Logic: Who can delete whom?
        const isManager = currentUser.role === UserRoleEnum.MANAGER;
        const isAdmin = currentUser.role === UserRoleEnum.ADMIN;

        const canDelete =
            // A Manager can delete any user except another Manager
            (isManager && targetUser.role !== UserRoleEnum.MANAGER) ||
            // An Admin can delete Users or Guests in the same store
            (isAdmin &&
                (targetUser.role === UserRoleEnum.USER ||
                    targetUser.role === UserRoleEnum.GUEST) &&
                currentUser.storeId === targetUser.storeId);

        if (!canDelete) {
            return handleError2(
                res,
                "You do not have permission to delete this user.",
                StatusCodes.FORBIDDEN,
            );
        }

        // Perform the soft delete by updating the status
        await db
            .update(users)
            .set({ status: UserStatusEnum.DELETED })
            .where(
                and(
                    eq(users.id, targetUserId),
                    eq(users.storeId, String(currentUser.storeId)), // <-- CRITICAL FIX: Add multi-tenancy filter
                ),
            );

        await ActivityLogService.logSystemEvent({
            userId: currentUser.id,
            storeId: String(currentUser.storeId),
            action: "USER_DELETED",
            entityId: targetUserId,
            entityType: ActivityEntityTypeEnum.USER,
            actorName: `${currentUser.firstName} ${currentUser.lastName}`,
            targetName: `${currentUser.firstName} ${currentUser.lastName}`,
            details: `User ${targetUser.firstName} ${targetUser.lastName} deleted by ${currentUser.firstName} ${currentUser.lastName}.`,
        });

        res.status(StatusCodes.OK).json({
            message: "User account has been successfully deleted.",
        });
    } catch (error) {
        // console.error("Error deleting user:", error);
        handleError2(
            res,
            "Failed to delete user.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

export const createUser = async (req: CustomRequest, res: Response) => {
    try {
        const currentUser = req.user?.data;
        const storeId = currentUser?.storeId;

        if (!storeId) {
            return handleError2(
                res,
                "User does not belong to a store.",
                StatusCodes.FORBIDDEN,
            );
        }

        const payload = req.body;

        const lowercasedEmail = payload.email.toLowerCase();

        // Example of an updated manual check for email uniqueness
        const existingUserByEmail = await db
            .select()
            .from(users)
            .where(
                and(
                    eq(users.email, lowercasedEmail),
                    eq(users.storeId, storeId),
                ),
            )
            .limit(1);

        if (existingUserByEmail.length > 0) {
            return handleError2(
                res,
                "A user with this email already exists in this store.",
                StatusCodes.CONFLICT,
            );
        }

        // Authorisation: Current user's role vs. target user's role
        const { role: currentRole } = currentUser;
        const { role: targetRole } = payload;

        // Define allowed roles for creation based on the current user's role
        const allowedCreations: { [key: string]: string[] } = {
            [UserRoleEnum.MANAGER]: [
                UserRoleEnum.MANAGER,
                UserRoleEnum.ADMIN,
                UserRoleEnum.USER,
                UserRoleEnum.GUEST,
            ],
            [UserRoleEnum.ADMIN]: [
                UserRoleEnum.ADMIN,
                UserRoleEnum.USER,
                UserRoleEnum.GUEST,
            ],
        };

        // Get the list of roles the current user is allowed to create
        const canCreateRoles = allowedCreations[currentRole] || [];

        if (!canCreateRoles.includes(targetRole)) {
            return handleError2(
                res,
                "You don't have permission to create this user type.",
                StatusCodes.FORBIDDEN,
            );
        }

        const hashedPassword = await passwordHashService.hash(payload.password);

        // *** CRITICAL CHANGE 3: Handle phone number conversion to NULL ***
        const phoneToInsert =
            payload.phone === "" || payload.phone === undefined
                ? null
                : payload.phone;

        // Construct the user object for insertion, explicitly picking fields
        // This prevents unexpected fields from req.body from being inserted
        const newUserToInsert: InsertUserSchemaT = {
            firstName: payload.firstName,
            lastName: payload.lastName,
            email: lowercasedEmail,
            password: hashedPassword,
            phone: phoneToInsert, // Use the NULL-safe phone value
            role: targetRole, // Use the validated target role
            status: UserStatusEnum.ACTIVE,
            storeId: storeId, // Assign the store ID from the current user
        };

        // CRITICAL FIX: Add the storeId to the value object
        const [newUser] = await db
            .insert(users)
            .values(newUserToInsert)
            .returning();

        await ActivityLogService.logSystemEvent({
            userId: currentUser.id,
            storeId: storeId,
            action: "USER_CREATED",
            entityId: newUser.id,
            entityType: ActivityEntityTypeEnum.USER,
            actorName: `${currentUser.firstName} ${currentUser.lastName}`,
            targetName: `${currentUser.firstName} ${currentUser.lastName}`,
            details: `User ${newUser.firstName} ${newUser.lastName} (${newUser.role}) created by ${currentUser.firstName} ${currentUser.lastName}.`,
        });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userWithoutPassword } = newUser;

        res.status(StatusCodes.CREATED).json(userWithoutPassword);
    } catch (error: any) {
        // console.error(error);
        // *** CRITICAL CHANGE 4: More specific error handling for unique constraints ***
        if (error.cause && error.cause.code === "23505") {
            // PostgresSQL unique violation error code
            if (error.cause.constraint === "users_email_unique") {
                return handleError2(
                    res,
                    "A user with this email already exists.",
                    StatusCodes.CONFLICT,
                );
            }
            if (error.cause.constraint === "users_storeId_phone_unique") {
                // Your new constraint name
                return handleError2(
                    res,
                    "A user with this phone number already exists in this store.",
                    StatusCodes.CONFLICT,
                );
            }
        }
        handleError2(
            res,
            "Problem creating user, please try again",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @desc    Update a user's profile information
 * @route   PATCH /users/:id
 * @access  Private
 * @body    { firstName?, lastName?, email?, phone?, role? }
 */
export const updateUser = async (req: CustomRequest, res: Response) => {
    try {
        const currentUser = req.user?.data;
        // const storeId = currentUser?.storeId;

        // Authenticated check
        if (!currentUser) {
            return handleError2(
                res,
                // "Must belong to a store to perform this action.",
                "Current user information is missing. Please ensure you are authenticated.",
                StatusCodes.UNAUTHORIZED,
            );
        }

        const validated = await validateStoreAndExtractDates(req, res);
        if (!validated) return;

        const { storeIds } = validated;

        const { id: targetUserId } = req.params;

        if (!targetUserId) {
            return handleError2(res, 'Missing user in request path.', StatusCodes.BAD_REQUEST);
        }

        if (typeof targetUserId !== "string") {
            return handleError2(
                res,
                "Invalid request user.",
                StatusCodes.BAD_REQUEST,
            )
        }

        const updateData = req.body;

        // Fetch the user to be updated from within the accessible store network
        const targetUser = await db.query.users.findFirst({
            where: and(
                eq(users.id, targetUserId),
                // inArray(users.storeId, accessibleStoreIds),
                inArray(users.storeId, storeIds),
            ),
        });

        if (!targetUser) {
            return handleError2(
                res,
                "User not found or not within your managed stores.",
                StatusCodes.NOT_FOUND,
            );
        }

        // Sanitise payload - password cannot be updated here
        delete updateData.password;
        delete updateData.id; // Prevent changing the ID
        delete updateData.storeId;

        // Authorisation Logic
        const isSelfUpdate = currentUser.id === targetUserId;
        const isManager = currentUser.role === UserRoleEnum.MANAGER;
        const isAdmin = currentUser.role === UserRoleEnum.ADMIN;
        let canUpdate = false;

        if (isSelfUpdate) {
            // Users cannot change their own role, store, or status
            delete updateData.role;
            delete updateData.storeId;
            delete updateData.status;
            canUpdate = true;
        } else if (isManager) {
            // Managers can update any user in their store
            canUpdate = true;
        } else if (isAdmin) {
            // Admins can update users (not Managers/Admins) in their store or branches
            if (
                targetUser.role !== UserRoleEnum.MANAGER &&
                targetUser.role !== UserRoleEnum.ADMIN
            ) {
                // Admins cannot change a user's role or store assignment
                delete updateData.role;
                delete updateData.storeId;
                canUpdate = true;
            }
        }

        if (!canUpdate) {
            return handleError2(
                res,
                "You do not have permission to update this user.",
                StatusCodes.FORBIDDEN,
            );
        }

        if (Object.keys(updateData).length === 0) {
            return handleError2(
                res,
                "No valid fields provided for update.",
                StatusCodes.BAD_REQUEST,
            );
        }

        // Perform the update
        if (Object.keys(updateData).length === 0) {
            return handleError2(
                res,
                "No valid fields provided for update.",
                StatusCodes.BAD_REQUEST,
            );
        }

        const { phone, email } = updateData;

        const lowercasedEmail = email.toLowerCase();

        const phoneToUpdate = phone === "" ? null : phone;

        // Perform the update, ensuring the target is still in an accessible store
        // I need to find a way to map each field that wanted to be update manually for security reason,
        // otherwise it will update any field that is in the req.body which can cause security issues like updating the storeId or role which can cause privilege escalation
        const [updatedUser] = await db
            .update(users)
            .set({
                email: lowercasedEmail,
                phone: phoneToUpdate,
                lastModified: new Date(),
                ...updateData,
            })
            .where(
                and(
                    eq(users.id, targetUserId),
                    inArray(users.storeId, storeIds),
                ),
            )
            .returning();

        await ActivityLogService.logSystemEvent({
            userId: currentUser.id,
            storeId: String(currentUser.storeId),
            action: "USER_UPDATED",
            entityId: targetUserId,
            entityType: ActivityEntityTypeEnum.USER,
            actorName: `${currentUser.firstName} ${currentUser.lastName}`,
            targetName: `${currentUser.firstName} ${currentUser.lastName}`,
            details: `User ${targetUser.firstName} ${targetUser.lastName} updated by ${currentUser.firstName} ${currentUser.lastName}.`,
        });

        // Return the updated user data (without password)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userWithoutPassword } = updatedUser;
        res.status(StatusCodes.OK).json(userWithoutPassword);
    } catch (error) {
        // console.error("Error updating user:", error);
        handleError2(
            res,
            "Failed to update user.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @desc        Change a user's store (Manager only)
 * @route       PATCH /api/v1/users/:targetUserId/change-store
 * @access      Private (Manager)
 * @param       id The ID of the user to move.
 * @body        { "newStoreId": "string" }
 */
export const changeUserStore = async (req: CustomRequest, res: Response) => {
    try {
        const currentUser = req.user?.data;
        const storeId = currentUser?.storeId;

        if(!storeId) {
            return handleError2(
                res,
                "Authenticated user is not associated with any store.",
                StatusCodes.UNAUTHORIZED,
            )
        }

        const { targetUserId } = req.params;
        const { newStoreId } = req.body;

        if (!targetUserId) {
            return handleError2(res, 'Missing user in request path.', StatusCodes.BAD_REQUEST);
        }

        if (typeof targetUserId !== "string") {
            return handleError2(
                res,
                "Invalid request user.",
                StatusCodes.BAD_REQUEST,
            )
        }

        if (!newStoreId) {
            return handleError2(
                res,
                "New store ID is required.",
                StatusCodes.BAD_REQUEST,
            );
        }

        if (currentUser.role !== UserRoleEnum.MANAGER) {
            return handleError2(
                res,
                "Only Managers can change user stores.",
                StatusCodes.UNAUTHORIZED
            )
        }

        if (storeId === targetUserId) {
            return handleError2(
                res,
                "Users cannot change their own store.",
                StatusCodes.FORBIDDEN,
            );
        }

        // Get all stores managed by the current manager
        const mainStore = await db.query.stores.findFirst({
            where: eq(stores.id, String(currentUser.storeId)),
            with: { branches: true },
        });

        if (!mainStore) {
            return handleError2(
                res,
                "Store not found.",
                StatusCodes.NOT_FOUND,
            );
        }

        // Standardised fetch for managed stores
        const managedStoreIds = await getUserStoreScope(UserRoleEnum.MANAGER, storeId);

        if (!managedStoreIds || !managedStoreIds.includes(newStoreId)) {
            return handleError2(res, "New store is outside your scope.", StatusCodes.FORBIDDEN);
        }

        // Fetch using the same logic as your successful getAllUsers
        const [targetUser] = await db
            .select()
            .from(users)
            .where(
                and(
                    eq(users.id, targetUserId),
                    inArray(users.storeId, managedStoreIds)
                )
            );

        if (!targetUser) {
            return handleError2(
                res,
                "User not found in your branches.",
                StatusCodes.NOT_FOUND,
            );
        }

        const allowedRolesToChange = [
            UserRoleEnum.ADMIN,
            UserRoleEnum.USER,
            UserRoleEnum.GUEST,
        ];

        if (!allowedRolesToChange.includes(targetUser.role as UserRoleEnum)) {
            return handleError2(
                res,
                "You can only change the store for Admins, Users, or Guests.",
                StatusCodes.FORBIDDEN,
            );
        }

        // Perform the update
        const [updatedUser] = await db
            .update(users)
            .set({ storeId: newStoreId, lastModified: new Date() })
            .where(eq(users.id, targetUserId))
            .returning();

        // Log and respond
        await ActivityLogService.logSystemEvent({
            userId: currentUser.id,
            storeId: String(currentUser.storeId),
            action: "USER_STORE_CHANGED",
            entityId: targetUserId,
            entityType: ActivityEntityTypeEnum.USER,
            actorName: `${currentUser.firstName} ${currentUser.lastName}`,
            targetName: `${currentUser.firstName} ${currentUser.lastName}`,
            details: `Store for user ${targetUser.firstName} ${targetUser.lastName} changed to store ID ${newStoreId}.`,
        });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userWithoutPassword } = updatedUser;
        res.status(StatusCodes.OK).json(userWithoutPassword);
    } catch (error) {
        handleError2(
            res,
            "Failed to change user store.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @desc    Update the current user's password
 * @route   PATCH /users/update-password
 * @access  Private (for the logged-in user)
 */
export const updatePassword = async (req: CustomRequest, res: Response) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const currentUser = req.user?.data;

        // 1. Basic validation
        if (!currentUser) {
            return handleError2(
                res,
                "Authentication required.",
                StatusCodes.UNAUTHORIZED,
            );
        }
        if (!oldPassword || !newPassword) {
            return handleError2(
                res,
                "Old password and new password are required.",
                StatusCodes.BAD_REQUEST,
            );
        }

        if (oldPassword === newPassword) {
            return handleError2(
                res,
                "Old password and new password must be different.",
                StatusCodes.BAD_REQUEST,
            );
        }

        if (newPassword.length < 6) {
            return handleError2(
                res,
                "New password must be at least 6 characters long.",
                StatusCodes.BAD_REQUEST,
            );
        }

        // 2. Fetch the user's current password from the DB
        const userRecord = await db.query.users.findFirst({
            where: eq(users.id, currentUser.id),
            columns: { password: true },
        });

        if (!userRecord) {
            return handleError2(
                res,
                "User not found.",
                StatusCodes.NOT_FOUND,
            );
        }

        // 3. Verify the old password
        const isMatch = await passwordHashService.compare(
            oldPassword,
            userRecord.password,
        );
        if (!isMatch) {
            return handleError2(
                res,
                "Incorrect old password.",
                StatusCodes.FORBIDDEN,
            );
        }

        // 4. Hash the new password and update the database
        const hashedNewPassword = await passwordHashService.hash(newPassword);
        await db
            .update(users)
            .set({ password: hashedNewPassword, lastModified: new Date() })
            .where(eq(users.id, currentUser.id));

        // Log activity for password change
        await ActivityLogService.logSystemEvent({
            userId: currentUser.id,
            storeId: String(currentUser.storeId),
            action: "PASSWORD_CHANGED",
            entityId: currentUser.id,
            entityType: ActivityEntityTypeEnum.USER,
            actorName: `${currentUser.firstName} ${currentUser.lastName}`,
            targetName: `${currentUser.firstName} ${currentUser.lastName}`,
            details: `Password changed by ${currentUser.firstName} ${currentUser.lastName}.`,
        });

        res.status(StatusCodes.OK).json({
            message: "Password updated successfully.",
        });
    } catch (error) {
        // console.error("Error updating password:", error);
        handleError2(
            res,
            "Failed to update password.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

export const loginUser = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    if (req.body.email) {
        req.body.email = req.body.email.toLowerCase();
    }

    passport.authenticate(
        "user",
        async (
            error: Error,
            user: Express.User,
            info: { message: string },
        ) => {
            // Handle Critical Server Errors
            if (error) {
                return handleError2(
                    res,
                    "Server error during authentication",
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    error,
                );
            }

            // Handle Invalid Credentials (FAILED LOGIN)
            if (!user) {
                // Log the failure asynchronously
                ActivityLogService.logSystemEvent({
                    userId: null as unknown as string,
                    storeId: null as unknown as string,
                    entityId: "AUTH_FAILURE",
                    entityType: ActivityEntityTypeEnum.USER,
                    action: "USER_LOGIN_FAILED",
                    actorName: "Unknown",
                    targetName: req.body.email || "Unknown Email",
                    details: `Failed login attempt for ${req.body.email}. Reason: ${info.message || 'Invalid credentials'}. IP: ${req.ip}`,
                }).catch(err => console.error("Logging failed", err));

                return handleError2(
                    res,
                    info.message || "Authentication failed",
                    StatusCodes.UNAUTHORIZED,
                );
            }

            // Fetch full User Data
            const [foundUser] = await db
                .select({
                    id: users.id,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    email: users.email,
                    phone: users.phone,
                    role: users.role,
                    status: users.status,
                    storeId: users.storeId,
                    createdAt: users.createdAt,
                    lastModified: users.lastModified,
                    store: {
                        id: stores.id,
                        name: stores.name,
                        location: stores.location,
                    },
                })
                .from(users)
                .leftJoin(stores, eq(users.storeId, stores.id))
                .where(
                    and(
                        eq(users.id, user.data.id),
                        ne(users.status, UserStatusEnum.DELETED),
                        ne(users.status, UserStatusEnum.BANNED),
                        ne(users.status, UserStatusEnum.INACTIVE)
                    )
                );

            // Handle Account Status Restrictions (FAILED LOGIN - Account Issue)
            if (!foundUser) {
                ActivityLogService.logSystemEvent({
                    userId: user.data.id,
                    storeId: user.data.storeId || null,
                    entityId: user.data.id,
                    entityType: ActivityEntityTypeEnum.USER,
                    action: "USER_LOGIN_FAILED",
                    actorName: "Restricted User",
                    targetName: user.data.email,
                    details: `Login blocked for ${user.data.email}. Account is Banned, Inactive, or Deleted.`,
                }).catch(err => console.error("Logging failed", err));

                return handleError2(
                    res,
                    "Access denied. Account may be inactive or deleted.",
                    StatusCodes.UNAUTHORIZED,
                );
            }

            // Establish Session and Generate Token (SUCCESSFUL LOGIN)
            req.login(user, async (loginError) => {
                if (loginError) {
                    return handleError2(
                        res,
                        "Login session failed",
                        StatusCodes.INTERNAL_SERVER_ERROR,
                        loginError
                    );
                }

                const token = generateToken(foundUser as unknown as UserSchemaT);

                if (!token) {
                    return handleError2(
                        res,
                        "Token generation failed.",
                        StatusCodes.INTERNAL_SERVER_ERROR,
                    );
                }

                // Log the Success
                await ActivityLogService.logSystemEvent({
                    userId: foundUser.id,
                    storeId: foundUser.storeId || null,
                    entityId: foundUser.id,
                    entityType: "user",
                    action: "USER_LOGIN",
                    actorName: `${foundUser.firstName} ${foundUser.lastName}`,
                    targetName: foundUser.email,
                    details: `User logged in successfully. IP: ${req.ip}`,
                    isRead: false
                }).catch(err => console.error("Logging success failed", err));

                return res
                    .status(StatusCodes.OK)
                    .json({ token, user: foundUser });
            });
        },
    )(req, res, next);
};

export const logoutUser = async (req: Request, res: Response) => {
    return res.status(StatusCodes.OK).json({ message: "Logout successful" });
};

export const getUserAccess = async (req: CustomRequest, res: Response) => {
    try {
        const user = req.user;

        const access = {
            id: user?.data.id,
            role: user?.data.role,
            firstName: user?.data.firstName,
            lastName: user?.data.lastName,
            email: user?.data.email,
            phone: user?.data.phone,
            status: user?.data.status,
            storeId: user?.data.storeId,
            createdAt: user?.data.createdAt,
            lastModified: user?.data.lastModified,
        };

        res.status(StatusCodes.OK).json(access);
    } catch (error) {
        // console.error(error);
        handleError2(
            res,
            "Problem loading user access, please try again",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @description Retrieves a history of user logins for auditing and active session monitoring.
 * @route GET /api/v1/admin/login-history
 * @access Admin, Manager
 */
export const getLoginHistory = async (req: CustomRequest, res: Response) => {
    try {
        const validated = await validateStoreAndExtractDates(req, res);
        if (!validated) return;

        const { storeIds, finalStartDate, finalEndDate } = validated;
        const { page = '1', limit = '20' } = req.query;

        const offset = (Number(page) - 1) * Number(limit);

        // Build the Where Clause
        // We strictly look for LOGIN actions within the user's authorized stores
        let whereClause = and(
            eq(activityLog.action, "USER_LOGIN"),
            inArray(activityLog.storeId, storeIds)
        );

        if (finalStartDate && finalEndDate) {
            whereClause = and(
                whereClause,
                gte(activityLog.createdAt, finalStartDate),
                lte(activityLog.createdAt, finalEndDate)
            );
        }

        // Fetch Logs with Joins
        const logs = await db.select({
            id: activityLog.id,
            timestamp: activityLog.createdAt,
            details: activityLog.details,
            userName: activityLog.actorName,
            userEmail: users.email,
            userRole: users.role,
            storeName: stores.name,
        })
            .from(activityLog)
            .innerJoin(users, eq(activityLog.userId, users.id))
            .leftJoin(stores, eq(activityLog.storeId, stores.id))
            .where(whereClause)
            .limit(Number(limit))
            .offset(offset)
            .orderBy(desc(activityLog.createdAt));

        // 3. Get Total Count for Pagination
        const [totalCount] = await db
            .select({ count: sql<number>`count(*)` })
            .from(activityLog)
            .where(whereClause);

        return res.status(StatusCodes.OK).json({
            logs,
            pagination: {
                total: Number(totalCount.count),
                page: Number(page),
                totalPages: Math.ceil(Number(totalCount.count) / Number(limit))
            }
        });

    } catch (error) {
        return handleError2(res, "Could not fetch login history", StatusCodes.INTERNAL_SERVER_ERROR, error instanceof Error ? error : undefined);
    }
};