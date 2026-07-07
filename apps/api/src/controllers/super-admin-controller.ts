import { CustomRequest } from "../types/express";
import { Response } from "express";
import db from "../shared/database";
import { stores } from "../schema/stores-schema";
import {
    billingTransactions,
    onboardStoreSchema,
    storeSubscriptions,
} from "../schema/store-subscriptions-schema";
import { users } from "../schema/users-schema";
import {
    BillingTypeEnum,
    StoreSubscriptionsBillingStatusEnum,
    SubscriptionStatusEnum,
    UserRoleEnum,
    UserStatusEnum,
} from "../types/enums";
import { ActivityLogService } from "../service/activity-service-log";
import { StatusCodes } from "http-status-codes";
import { handleError2 } from "../service/error-handling";
import { desc, eq } from "drizzle-orm";
import { formatPhoneNumber } from "../utils/format-phone-number";

export const getAllStoresForSuperAdmin = async (
    _req: CustomRequest,
    res: Response,
) => {
    try {
        const allStores = await db
            .select()
            .from(stores)
            .orderBy(desc(stores.createdAt))
            .leftJoin(
                storeSubscriptions,
                eq(stores.id, storeSubscriptions.storeId),
            );

        // Flatten the Drizzle result
        const formattedStores = allStores.map((row) => ({
            ...row.stores,
            storeSubscriptions: row.storeSubscriptions,
        }));

        return res.status(StatusCodes.OK).json(formattedStores);
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
        const validation = onboardStoreSchema.safeParse(req.body);

        if (!validation.success) {
            return handleError2(
                res,
                "Validation failed",
                StatusCodes.BAD_REQUEST,
                validation.error, // Passes the specific field errors back to the frontend
            );
        }

        const { firstName, lastName, email, phone, storeName, location } =
            req.body;
        const formattedPhone = formatPhoneNumber(phone);
        // const tempPassword = "Welcome@Store123";

        const existing = await db.query.users.findFirst({
            where: eq(users.email, email.toLowerCase()),
        });

        if (existing)
            return handleError2(
                res,
                "Email already in use",
                StatusCodes.CONFLICT,
            );

        // Transaction: Ensure everything succeeds or everything fails
        const result = await db.transaction(async (tx) => {
            // Create the Store
            const [newStore] = await tx
                .insert(stores)
                .values({
                    name: storeName,
                    location: location,
                })
                .returning();

            // Create the Store Subscription (Initial State: pending_setup)
            await tx.insert(storeSubscriptions).values({
                storeId: newStore.id,
                status: SubscriptionStatusEnum.PENDING_SETUP,
                setupFeePaid: false,
            });

            const [manager] = await tx
                .insert(users)
                .values({
                    firstName: firstName,
                    lastName: lastName,
                    email: email.toLowerCase(),
                    phone: String(formattedPhone),
                    // password: hashedPassword,
                    role: UserRoleEnum.MANAGER,
                    storeId: newStore.id,
                    status: UserStatusEnum.ACTIVE,
                })
                .returning();

            return { store: newStore, manager };
        });

        // EmailService.sendManagerWelcome(
        //     email,
        //     firstName,
        //     tempPassword,
        //     storeName,
        // ).catch((err) => console.error("Non-blocking email error:", err));

        // Log this event
        await ActivityLogService.logSystemEvent({
            userId: req.user?.data.id || null, // The Super Admin's ID
            storeId: null, // Global event
            action: "STORE_CREATED",
            entityId: result.store.id,
            entityType: "store",
            actorName: "Super Admin",
            details: `Onboarded store: ${storeName} with manager: ${email}`,
        });

        return res.status(StatusCodes.CREATED).json({
            message: "Store onboarded successfully.",
            data: result,
        });
    } catch (error) {
        // Handle Drizzle Unique Constraint errors (e.g. email already exists)
        if (
            error instanceof Error &&
            error.message.includes("unique constraint")
        ) {
            return handleError2(
                res,
                "Email already registered",
                StatusCodes.CONFLICT,
            );
        }

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
        const { storeId, firstName, lastName, email, phone } = req.body;
        const formattedPhone = formatPhoneNumber(phone);

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

        const [newManager] = await db
            .insert(users)
            .values({
                firstName,
                lastName,
                email: email.toLowerCase(),
                // password: hashedPassword,
                phone: String(formattedPhone),
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
export const storeSetupPayment = async (req: CustomRequest, res: Response) => {
    try {
        const { storeId, amount, reference } = req.body;

        await db.transaction(async (tx) => {
            // Create the billing record
            await tx.insert(billingTransactions).values({
                storeId,
                amount: amount.toString(),
                reference: reference || `MANUAL-${Date.now()}`,
                type: BillingTypeEnum.SETUP_FEE,
                status: StoreSubscriptionsBillingStatusEnum.SUCCESS,
            });

            // Update Subscription status
            // const isSetup = type === BillingTypeEnum.SETUP_FEE;

            // Calculate the next billing date (30 days from now)
            const nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + 30);

            await tx
                .update(storeSubscriptions)
                .set({
                    status: SubscriptionStatusEnum.ACTIVE,
                    setupFeePaid: true,
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
