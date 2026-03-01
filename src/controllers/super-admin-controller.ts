import { CustomRequest } from "../types/express";
import { Response } from "express";
import db from "../db";
import { stores } from "../schema/stores-schema";
import {
    billingTransactions,
    storeSubscriptions,
} from "../schema/store-subscriptions-schema";
import { passwordHashService } from "../service/password-hash-service";
import { users } from "../schema/users-schema";
import { UserRoleEnum, UserStatusEnum } from "../types/enums";
import { ActivityLogService } from "../service/activity-service-log";
import { StatusCodes } from "http-status-codes";
import { handleError2 } from "../service/error-handling";
import { eq } from "drizzle-orm";

export const getAllStoresForSuperAdmin = async (
    req: CustomRequest,
    res: Response,
) => {
    try {
        const allStores = await db
            .select()
            .from(stores)
            .leftJoin(
                storeSubscriptions,
                eq(stores.id, storeSubscriptions.storeId),
            );

        return res.status(StatusCodes.OK).json(allStores);
    } catch (error) {
        return handleError2(
            res,
            "Failed to fetch stores",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @description Super Admin: Create a new store and its first manager
 * @route POST /api/v1/super-admin/stores/onboard
 */
export const onboardNewStore = async (req: CustomRequest, res: Response) => {
    try {
        const {
            storeName,
            location,
            managerEmail,
            managerFirstName,
            managerLastName,
        } = req.body;

        // 1. Transaction: Ensure everything succeeds or everything fails
        const result = await db.transaction(async (tx) => {
            // A. Create the Store
            const [newStore] = await tx
                .insert(stores)
                .values({
                    name: storeName,
                    location: location,
                })
                .returning();

            // B. Create the Store Subscription (Initial State: pending_setup)
            await tx.insert(storeSubscriptions).values({
                storeId: newStore.id,
                status: "pendingSetup",
                setupFeePaid: false,
            });

            // C. Create the Manager User
            const tempPassword = "Welcome@Store123"; // In production, generate a random hash
            const hashed = await passwordHashService.hash(tempPassword);

            const [manager] = await tx
                .insert(users)
                .values({
                    firstName: managerFirstName,
                    lastName: managerLastName,
                    email: managerEmail.toLowerCase(),
                    password: hashed,
                    role: UserRoleEnum.MANAGER,
                    storeId: newStore.id,
                    status: UserStatusEnum.ACTIVE,
                })
                .returning();

            return { store: newStore, manager };
        });

        // Log this event
        await ActivityLogService.logSystemEvent({
            userId: req.user?.data.id || null, // The Super Admin's ID
            storeId: null, // Global event
            action: "STORE_CREATED",
            entityId: result.store.id,
            entityType: "store",
            actorName: "Super Admin",
            details: `Onboarded store: ${storeName} with manager: ${managerEmail}`,
        });

        return res.status(StatusCodes.CREATED).json({
            message: "Store onboarded successfully.",
            data: result,
        });
    } catch (error) {
        return handleError2(
            res,
            "Onboarding failed",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @description Super Admin: Create a Manager for a specific store
 * @route POST /api/v1/super-admin/managers/create
 */
export const createStoreManager = async (req: CustomRequest, res: Response) => {
    try {
        const { storeId, firstName, lastName, email, password } = req.body;

        // Verify the store exists
        const store = await db.query.stores.findFirst({
            where: eq(stores.id, storeId),
        });

        if (!store) {
            return handleError2(
                res,
                "Target store not found",
                StatusCodes.NOT_FOUND,
            );
        }

        // Check if email is already taken
        const existingUser = await db.query.users.findFirst({
            where: eq(users.email, email.toLowerCase()),
        });

        if (existingUser) {
            return handleError2(
                res,
                "User with this email already exists",
                StatusCodes.CONFLICT,
            );
        }

        // Create Manager
        const hashedPassword = await passwordHashService.hash(password);
        const [newManager] = await db
            .insert(users)
            .values({
                firstName,
                lastName,
                email: email.toLowerCase(),
                password: hashedPassword,
                role: UserRoleEnum.MANAGER,
                storeId: storeId,
                status: UserStatusEnum.ACTIVE,
            })
            .returning();

        // 4. Log the action
        await ActivityLogService.logSystemEvent({
            userId: req.user?.data.id || null,
            storeId: storeId, // Associate with the store being managed
            action: "MANAGER_REGISTERED",
            entityId: newManager.id,
            entityType: "user",
            actorName: "Super Admin",
            details: `Super Admin created manager ${email} for store: ${store.name}`,
        });

        return res.status(StatusCodes.CREATED).json({
            message: "Manager created successfully",
            managerId: newManager.id,
        });
    } catch (error) {
        return handleError2(
            res,
            "Failed to create manager",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @description Manually confirm a payment (Setup Fee or Monthly)
 */
export const confirmStorePayment = async (
    req: CustomRequest,
    res: Response,
) => {
    try {
        const { storeId, amount, reference, type } = req.body;

        await db.transaction(async (tx) => {
            // Create the billing record
            await tx.insert(billingTransactions).values({
                storeId,
                amount: amount.toString(),
                reference: reference || `MANUAL-${Date.now()}`,
                type: type, // 'setupFee' | 'monthlySubscription'
                status: "success",
            });

            // Update Subscription status
            const isSetup = type === "setupFee";

            // Calculate the next billing date (30 days from now)
            const nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + 30);

            await tx
                .update(storeSubscriptions)
                .set({
                    status: "active",
                    setupFeePaid: isSetup ? true : undefined,
                    nextBillingDate: nextDate,
                    lastBillingDate: new Date(),
                })
                .where(eq(storeSubscriptions.storeId, storeId));
        });

        return res
            .status(StatusCodes.OK)
            .json({ message: "Payment confirmed successfully" });
    } catch (error) {
        return handleError2(
            res,
            "Payment confirmation failed",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};
