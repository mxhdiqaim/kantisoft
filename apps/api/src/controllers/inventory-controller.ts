/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, desc, eq, ExtractTablesWithRelations, gte, inArray, ne, SQL } from "drizzle-orm";
import { Response } from "express";
import { db } from "../shared/database";
import { inventory } from "../schema/inventory-schema";
import { handleError2 } from "../service/error-handling";
import { CustomRequest } from "../types/express";
import { logActivity } from "../service/activity-logger";
import { calculateInventoryStatus, getInventoryByMenuItemId } from "../helpers";
import { StatusCodes } from "http-status-codes";
import { inventoryTransactions } from "../schema/inventory-schema/inventory-transaction-schema";
import { getStockAdjustedAction } from "../shared/utils/inventory-utils";
import { menuItems } from "../schema/menu-items-schema";
import { OrderItemStockUpdate } from "../types";
import { lte } from "drizzle-orm/sql/expressions/conditions";
import { validateStoreAndExtractDates } from "../shared/utils/validate-store-dates";
import { InsufficientStockError } from "../errors";
import { INVENTORY_TRANSACTION_SUMMARY_TYPES, InventoryTransactionTypeEnum, UserRoleEnum } from "../types/enums";
import { determineFinalStoreId } from "../shared/utils/store-permission-utils";
import { InventoryAlertService } from "../service/inventory-alert-service";
import { users } from "../schema/users-schema";
import { stores } from "../schema/stores-schema";
import { getInventoryTransactionTypeLabel } from "../shared/utils";
import { PgTransaction } from "drizzle-orm/pg-core";
import { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import schema from "../db/schema";

// This type represents a transaction in your specific schema using postgres-js
type Transaction = PgTransaction<PostgresJsQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;

/**
 * @desc    Get all inventory records for the user's store
 * @route   GET /api/v1/inventory/
 * @access  Private (Store-associated users only)
 */
export const getAllInventory = async (req: CustomRequest, res: Response) => {
    try {
        const validated = await validateStoreAndExtractDates(req, res);
        if (!validated) return;

        const { storeIds } = validated;
        const { page = "1", limit = "10" } = req.query;

        const pageNumber = parseInt(page as string, 10);
        const limitNumber = parseInt(limit as string, 10);
        const offset = (pageNumber - 1) * limitNumber;

        const whereClause = inArray(inventory.storeId, storeIds);

        const allInventory = await db.query.inventory.findMany({
            where: whereClause,
            orderBy: [desc(inventory.lastModified)],
            limit: limitNumber,
            offset: offset,
            with: {
                menuItem: {
                    columns: { name: true, itemCode: true, sku: true },
                },
                store: { columns: { name: true } },
            },
        });

        res.status(StatusCodes.OK).json(allInventory);
    } catch (error) {
        handleError2(
            res,
            "Problem loading inventory data, please try again",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @desc    Get all inventory transaction history for a single menu item
 * @route   GET /api/v1/inventory/transactions/:menuItemId
 * @access  Private (Store-associated users only)
 * @query   ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
export const getTransactionsByMenuItem = async (req: CustomRequest, res: Response) => {
    try {
        const currentUser = req.user?.data;
        const storeId = currentUser?.storeId;
        const userRole = currentUser?.role;

        if (!storeId) {
            return handleError2(res, "You must be associated with a store.", StatusCodes.FORBIDDEN);
        }

        const { id: menuItemId } = req.params;
        const { startDate, endDate, targetStoreId } = req.query;

        if (!menuItemId) {
            return handleError2(res, "Menu item is required.", StatusCodes.BAD_REQUEST);
        }

        if (typeof menuItemId !== "string") {
            return handleError2(res, "Invalid menu item.", StatusCodes.BAD_REQUEST);
        }

        const finalStoreId = await determineFinalStoreId(
            res,
            userRole as UserRoleEnum,
            storeId,
            targetStoreId as string,
        );
        if (!finalStoreId) return; // Error already handled

        // Base condition: Filter by the item ID and the store ID
        let whereClause = and(
            eq(inventoryTransactions.menuItemId, menuItemId),
            eq(inventoryTransactions.storeId, finalStoreId),
        );

        // Optional: Add date range filtering
        if (startDate && endDate) {
            whereClause = and(
                whereClause,
                gte(inventoryTransactions.transactionDate, new Date(startDate as string)),
                lte(inventoryTransactions.transactionDate, new Date(endDate as string)),
            );
        }

        const transactions = await db.query.inventoryTransactions.findMany({
            where: whereClause,
            orderBy: [desc(inventoryTransactions.transactionDate)],
            with: {
                // Fetch related data for context
                performedByUser: {
                    columns: { firstName: true, lastName: true },
                },
                menuItem: { columns: { name: true, itemCode: true } },
            },
        });

        if (transactions.length === 0) {
            return handleError2(res, "No transaction history found for this item.", StatusCodes.NOT_FOUND);
        }

        res.status(StatusCodes.OK).json(transactions);
    } catch (error) {
        handleError2(
            res,
            "Problem loading transaction history, please try again.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @desc    Get a summary of all inventory movements within a specified period
 * @route   GET /api/v1/inventory/transactions
 * @access  Private (Store-associated users only)
 * @query   ?timePeriod=week OR ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
export const getInventoryTransactions = async (req: CustomRequest, res: Response) => {
    try {
        const validated = await validateStoreAndExtractDates(req, res);
        if (!validated) return;

        const { storeIds, finalStartDate, finalEndDate, periodUsed, storeQueryType } = validated;
        const { menuItemId } = req.query; // Optional filter for specific product

        // Construct the Base WHERE clause
        let whereClause: SQL | undefined = inArray(inventoryTransactions.storeId, storeIds);

        // Date Filtering
        if (finalStartDate && finalEndDate) {
            whereClause = and(
                whereClause,
                gte(inventoryTransactions.transactionDate, finalStartDate),
                lte(inventoryTransactions.transactionDate, finalEndDate),
            );
        }

        // Specific Item Filter
        if (menuItemId && menuItemId !== "all") {
            whereClause = and(whereClause, eq(inventoryTransactions.menuItemId, menuItemId as string));
        }

        // The Detailed Select Query (Joining for "Elaboration")
        const transactionLogs = await db
            .select({
                id: inventoryTransactions.id,
                type: inventoryTransactions.transactionType,
                quantityChange: inventoryTransactions.quantityChange,
                notes: inventoryTransactions.notes,
                transactionDate: inventoryTransactions.transactionDate,
                createdAt: inventoryTransactions.createdAt,

                // Item details
                item: {
                    name: menuItems.name,
                    price: menuItems.price,
                },

                // User details (Actor)
                actor: {
                    firstName: users.firstName,
                    lastName: users.lastName,
                },

                // Store details (Context)
                storeName: stores.name,
            })
            .from(inventoryTransactions)
            .innerJoin(menuItems, eq(inventoryTransactions.menuItemId, menuItems.id))
            .leftJoin(users, eq(inventoryTransactions.performedBy, users.id)) // Use leftJoin if performedBy can be null
            .innerJoin(stores, eq(inventoryTransactions.storeId, stores.id))
            .where(whereClause)
            .orderBy(desc(inventoryTransactions.transactionDate), desc(inventoryTransactions.createdAt));

        // Post-Processing (Labels and formatting)
        const transactionHistory = transactionLogs.map((item) => {
            return {
                id: item.id,
                itemName: item.item.name,

                // Transaction Data
                type: item.type,
                quantity: item.quantityChange, // Positive for IN, Negative for OUT
                notes: item.notes,
                transactionDate: item.transactionDate,

                // Metadata Label (The Elaboration)
                label: getInventoryTransactionTypeLabel(item.type),

                // Audit Info
                performedBy: item.actor ? `${item.actor.firstName} ${item.actor.lastName}` : "System/Automatic",
                storeName: item.storeName,
                createdAt: item.createdAt,
            };
        });

        return res.status(StatusCodes.OK).json({
            startDate: finalStartDate ? finalStartDate.toISOString() : "All Time",
            endDate: finalEndDate ? finalEndDate.toISOString() : "All Time",
            timePeriod: periodUsed,
            storeQueryType,
            count: transactionHistory.length,
            transactions: transactionHistory,
        });
    } catch (error) {
        return handleError2(
            res,
            "Problem generating inventory history.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @desc    Get a single inventory record by Menu Item ID
 * @route   GET /api/v1/inventory/:menuItemId
 * @access  Private (Store-associated users only)
 */
export const getInventoryByMenuItem = async (req: CustomRequest, res: Response) => {
    try {
        const currentUser = req.user?.data;
        const storeId = currentUser?.storeId;
        const userRole = currentUser?.role;

        if (!storeId) {
            return handleError2(res, "You must be associated with a store to view inventory.", StatusCodes.FORBIDDEN);
        }

        const { id: menuItemId } = req.params;
        const { targetStoreId } = req.query;

        if (!menuItemId) {
            return handleError2(res, "Menu item is required.", StatusCodes.BAD_REQUEST);
        }

        if (typeof menuItemId !== "string") {
            return handleError2(res, "Invalid menu item.", StatusCodes.BAD_REQUEST);
        }

        const finalStoreId = await determineFinalStoreId(
            res,
            userRole as UserRoleEnum,
            storeId,
            targetStoreId as string,
        );
        if (!finalStoreId) return; // Error already handled

        const inventoryItem = await getInventoryByMenuItemId(menuItemId, finalStoreId);

        if (!inventoryItem) {
            return handleError2(res, "Inventory record not found for this menu item.", StatusCodes.NOT_FOUND);
        }

        res.status(StatusCodes.OK).json(inventoryItem);
    } catch (error) {
        // console.error(error);
        return handleError2(
            res,
            "Problem loading inventory item, please try again",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/*
 * @desc Create an inventory record for a menu item
 * @route POST /api/v1/inventory/create
 * @access Private (Store-associated users only)
 */
export const createInventoryRecord = async (req: CustomRequest, res: Response) => {
    try {
        const currentUser = req.user?.data;
        const storeId = currentUser?.storeId;
        const userRole = currentUser?.role;

        if (!storeId) {
            return handleError2(res, "You must be associated with a store to view inventory.", StatusCodes.FORBIDDEN);
        }

        const { targetStoreId } = req.query;
        const { menuItemId, quantity, minStockLevel } = req.body;

        const finalStoreId = await determineFinalStoreId(
            res,
            userRole as UserRoleEnum,
            storeId,
            targetStoreId as string,
        );
        if (!finalStoreId) return; // Error already handled

        // Validation and Existence Checks
        if (!menuItemId || quantity === undefined) {
            return handleError2(res, "Menu item and initial quantity are required.", StatusCodes.BAD_REQUEST);
        }

        const existingInventory = await getInventoryByMenuItemId(menuItemId, finalStoreId);

        if (existingInventory) {
            return handleError2(
                res,
                "Inventory record already exists for this menu item in your store.",
                StatusCodes.CONFLICT,
            );
        }

        const existingMenuItem = await db.query.menuItems.findFirst({
            where: and(eq(menuItems.id, menuItemId), eq(menuItems.storeId, finalStoreId)),
            columns: { id: true, name: true }, // Only fetch what is needed
        });

        if (!existingMenuItem) {
            return handleError2(res, `Menu item not found in your store.`, StatusCodes.NOT_FOUND);
        }

        // Insert a new Inventory record
        const [newInventory] = await db
            .insert(inventory)
            .values({
                menuItemId,
                storeId: finalStoreId,
                quantity: quantity,
                minStockLevel: minStockLevel,
                // status will be set based on minStockLevel logic
            })
            .returning();

        // Log initial stock transaction
        await db.insert(inventoryTransactions).values({
            menuItemId,
            storeId: finalStoreId,
            transactionType: "adjustmentIn", // Treat the initial setting as an adjustment in
            quantityChange: quantity,
            resultingQuantity: quantity,
            performedBy: currentUser?.id,
            notes: "Initial inventory setup.",
        });

        // Log activity
        await logActivity({
            userId: currentUser?.id,
            storeId: finalStoreId,
            action: "INVENTORY_RECORD_CREATED",
            entityId: newInventory.id,
            entityType: "inventory",
            details: `Initial inventory record created for Menu Item ${menuItemId} with quantity ${newInventory.quantity}.`,
        });

        res.status(StatusCodes.CREATED).json(newInventory);
    } catch (error) {
        // console.error(error);
        handleError2(
            res,
            "Problem creating inventory record, please try again.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @description Update stock quantity or status for a specific menu item in the current store scope.
 * @route PATCH /api/v1/inventory/:menuItemId
 * @access Private (Admin/Manager)
 */
// export const updateInventory = async (req: CustomRequest, res: Response) => {
//     try {
//         const { menuItemId } = req.params;
//         const { quantity, inventoryStatus, lastCountDate, transactionType, notes } = req.body as UpdateInventoryBody;
//
//         // const validated = await validateStoreAndExtractDates(req, res);
//         // if (!validated) return;
//
//         const currentUser = req.user?.data;
//         const storeId = currentUser?.storeId;
//
//         if (!storeId) {
//             // Managers must use the ?targetStoreId=X parameter if they are updating a branch.
//             console.log("Inventory updates must target a single store. Please use the targetStoreId query parameter.")
//             return handleError2(
//                 res,
//                 "Store not found",
//                 StatusCodes.BAD_REQUEST,
//             );
//         }
//
//         const updateData: Partial<typeof inventory.$inferInsert> = {
//             lastModified: new Date(),
//         };
//
//         if (quantity !== undefined) updateData.quantity = quantity;
//         if (inventoryStatus) updateData.status = inventoryStatus;
//         if (lastCountDate) updateData.lastCountDate = lastCountDate;
//
//         const updatedInventory = await db.transaction(async (tx) => {
//             // Execute the update
//             const [updated] = await db
//                 .update(inventory)
//                 .set(updateData)
//                 .where(and(
//                     eq(inventory.menuItemId, menuItemId),
//                     eq(inventory.storeId, storeId)
//                 ))
//                 .returning();
//
//             // if (!updatedInventory) {
//             //     return handleError2(
//             //         res,
//             //         "Inventory record not found for the specified item/store.",
//             //         StatusCodes.NOT_FOUND,
//             //     );
//             // }
//
//             // Insert the Inventory Transaction record
//             await tx
//                 .insert(inventoryTransactions)
//                 .values({
//                     menuItemId,
//                     storeId,
//                     transactionType,
//                     quantityChange: quantity,
//                     resultingQuantity: newQuantity,
//                     performedBy: userId,
//                     notes: notes,
//                     transactionDate: new Date(),
//                 })
//                 .returning({ id: inventoryTransactions.id });
//         })
//
//
//         res.status(StatusCodes.OK).json(updatedInventory);
//     } catch (error) {
//         return handleError2(
//             res,
//             "Failed to update inventory.",
//             StatusCodes.INTERNAL_SERVER_ERROR,
//             error instanceof Error ? error : undefined
//         );
//     }
// };

/*
 * @desc    Adjust stock level for a menu item (manual adjustment)
 * @route   PATCH /api/v1/inventory/adjust-stock/:menuItemId
 * @access  Private (Store-associated users only)
 * @body    { quantityAdjustment: number, transactionType: string, notes?: string }
 * quantityAdjustment: positive or negative number indicating the change
 * transactionType: one of 'adjustmentIn', 'adjustmentOut', 'purchaseReceive'
 * notes: optional reason for adjustment
 */
export const adjustStock = async (req: CustomRequest, res: Response) => {
    try {
        const currentUser = req.user?.data;
        const storeId = currentUser?.storeId;
        const userId = currentUser?.id;
        const userRole = currentUser?.role;

        if (!storeId) {
            return handleError2(res, "You must be associated with a store to adjust inventory.", StatusCodes.FORBIDDEN);
        }

        const { id: menuItemId } = req.params;
        const { targetStoreId } = req.query;

        if (!menuItemId) {
            return handleError2(res, "Menu item is required.", StatusCodes.BAD_REQUEST);
        }

        if (typeof menuItemId !== "string") {
            return handleError2(res, "Invalid menu item.", StatusCodes.BAD_REQUEST);
        }

        const { quantityAdjustment, transactionType, notes } = req.body; // quantityAdjustment is the delta (+ or -)

        const finalStoreId = await determineFinalStoreId(
            res,
            userRole as UserRoleEnum,
            storeId,
            targetStoreId as string,
        );
        if (!finalStoreId) return; // Error already handled

        // Validation
        if (quantityAdjustment === undefined || !transactionType) {
            return handleError2(
                res,
                "Quantity adjustment amount and transaction type are required.",
                StatusCodes.BAD_REQUEST,
            );
        }

        const changeAmount = Number(quantityAdjustment);
        if (isNaN(changeAmount) || changeAmount === 0) {
            return handleError2(res, "Quantity adjustment must be a non-zero number.", StatusCodes.BAD_REQUEST);
        }

        // Types allowed for manual change via API
        if (!INVENTORY_TRANSACTION_SUMMARY_TYPES.includes(transactionType)) {
            return handleError2(
                res,
                `Invalid transaction type for manual adjustment.`,
                // `Invalid transaction type for manual adjustment. Must be one of: ${validAdjustmentTypes.join(", ")}.`,
                StatusCodes.BAD_REQUEST,
            );
        }

        // Fetch current inventory
        const currentInventory = await getInventoryByMenuItemId(menuItemId, finalStoreId);

        if (!currentInventory) {
            return handleError2(res, "Inventory record not found. Create a record first.", StatusCodes.NOT_FOUND);
        }

        // Calculate new quantity
        const currentQuantity = currentInventory.quantity;
        const newQuantity = currentQuantity + changeAmount;
        const minStockLevel = currentInventory.minStockLevel; // Retrieve minStockLevel

        if (newQuantity < 0) {
            return handleError2(
                res,
                "Cannot adjust stock to a negative quantity. Check your current stock and adjustment amount.",
                StatusCodes.BAD_REQUEST,
            );
        }

        const newStatus = calculateInventoryStatus(newQuantity, minStockLevel);

        // Update the Inventory table and log the Transaction (within a transaction block for safety)
        const updatedInventory = await db.transaction(async (tx) => {
            //  Update the Inventory record
            const [updated] = await tx
                .update(inventory)
                .set({
                    quantity: newQuantity,
                    lastModified: new Date(),
                    lastCountDate: new Date(),
                    // TODO: (Future) Add logic here to update 'status' based on 'newQuantity' vs 'minStockLevel'
                    status: newStatus,
                })
                .where(and(eq(inventory.menuItemId, menuItemId), eq(inventory.storeId, finalStoreId)))
                .returning();

            // Insert the Inventory Transaction record
            await tx
                .insert(inventoryTransactions)
                .values({
                    menuItemId,
                    storeId: finalStoreId,
                    transactionType,
                    quantityChange: changeAmount,
                    resultingQuantity: newQuantity,
                    performedBy: userId,
                    notes: notes,
                    transactionDate: new Date(),
                })
                .returning({ id: inventoryTransactions.id });

            return updated;
        });

        // 5. Log activity
        await logActivity({
            userId: userId,
            storeId: finalStoreId,
            // action: `STOCK_ADJUSTED_${transactionType.toUpperCase()}`,
            action: getStockAdjustedAction(transactionType),
            entityId: updatedInventory.id,
            entityType: "inventory",
            details: `Stock for Menu Item ${menuItemId} adjusted by ${changeAmount}. New quantity: ${newQuantity}.`,
        });

        res.status(StatusCodes.OK).json(updatedInventory);
    } catch (error) {
        // console.error(error);
        handleError2(
            res,
            "Problem adjusting stock level, please try again.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @desc    [INTERNAL] Decrement stock levels for all items in a completed order.
 * @route   (Internal API call - no external route needed, or use a POST route without user authentication)
 * @access  Internal (Called by Order Controller)
 * @body    { orderId: string, items: OrderItemStockUpdate[], performedBy: string, storeId: string }
 */
export const decrementStockForOrder = async (
    reference: string,
    orderId: string,
    items: OrderItemStockUpdate[],
    performedBy: string,
    storeId: string,
    tx: Transaction,
) => {
    try {
        if (!items || items.length === 0) {
            return; // No items to process
        }

        // Fetch current inventory for all relevant items
        const menuItemIds = items.map((item) => item.menuItemId);

        // Fetch current inventory records using the TRANSACTION object (tx), NOT db
        // This ensures the stock check is part of the overall Order creation unit of work.
        const currentInventoryRecords = await tx
            .select()
            .from(inventory)
            .where(and(eq(inventory.storeId, storeId), inArray(inventory.menuItemId, menuItemIds)));

        const inventoryMap = new Map(currentInventoryRecords.map((item) => [item.menuItemId, item]));

        // Pre-check: Ensure all items exist and have enough inventories (stocks)
        for (const item of items) {
            const currentRecord = inventoryMap.get(item.menuItemId);

            // If the inventory record is missing, throw an error and roll back the Order.
            // Suggestion: Fetch the name from the inventory record (if joined) or pass it in so the error message is human-readable.
            if (!currentRecord) {
                throw new InsufficientStockError(`Item not found in inventory.`);
            }

            if (currentRecord.quantity < item.quantity) {
                // Insufficient stock, throw an error and roll back the Order.
                throw new InsufficientStockError(
                    `Insufficient stock. Available: ${currentRecord.quantity}. requested: ${item.quantity}.`,
                );
            }
        }

        // Perform atomic update: Update inventory and log transactions for all items
        // REMOVE the nested db.transaction block and use the passed `tx` object
        for (const item of items) {
            const currentRecord = inventoryMap.get(item.menuItemId)!;
            const changeAmount = -item.quantity;
            const newQuantity = currentRecord.quantity + changeAmount;
            const minStockLevel = currentRecord.minStockLevel;

            // Calculate the new status (using the helper function you planned)
            const newStatus = calculateInventoryStatus(newQuantity, minStockLevel);

            // Update Inventory record using the transaction object (tx)
            await tx
                .update(inventory)
                .set({
                    quantity: newQuantity,
                    lastModified: new Date(),
                    lastCountDate: new Date(),
                    status: newStatus,
                })
                .where(and(eq(inventory.menuItemId, item.menuItemId), eq(inventory.storeId, storeId)));

            // Insert Inventory Transaction record using the transaction object (tx)
            await tx.insert(inventoryTransactions).values({
                menuItemId: item.menuItemId,
                storeId: storeId,
                transactionType: "sale",
                quantityChange: changeAmount,
                resultingQuantity: newQuantity,
                performedBy: performedBy,
                notes: `Sale via Order Reference: ${reference}`,
                sourceDocumentId: orderId,
                transactionDate: new Date(),
            });
        }

        return true; // Success indicator
    } catch (error) {
        // Log the error but re-throw it so the calling controller can roll back the order creation/update
        console.error("Error decrementing stock for order:", error);
        throw error;
    }
};

/**
 * @desc    Mark an inventory record as 'discontinued'.
 * @route   PATCH /api/v1/inventory/discontinue/:menuItemId
 * @access  Private (Manager/Admin only)
 */
export const discontinueInventory = async (req: CustomRequest, res: Response) => {
    try {
        const currentUser = req.user?.data;
        const storeId = currentUser?.storeId;
        const userId = currentUser?.id;
        const userRole = currentUser?.role;

        if (!storeId) {
            return handleError2(res, "You must be associated with a store.", StatusCodes.FORBIDDEN);
        }

        const { id: menuItemId } = req.params;
        const { targetStoreId } = req.query;

        if (!menuItemId) {
            return handleError2(res, "Menu item is required.", StatusCodes.BAD_REQUEST);
        }

        if (typeof menuItemId !== "string") {
            return handleError2(res, "Invalid menu item.", StatusCodes.BAD_REQUEST);
        }

        const finalStoreId = await determineFinalStoreId(
            res,
            userRole as UserRoleEnum,
            storeId,
            targetStoreId as string,
        );
        if (!finalStoreId) return; // Error already handled

        const [updatedInventory] = await db
            .update(inventory)
            .set({
                status: InventoryTransactionTypeEnum.DISCONTINUED, // Set to the desired status
                lastModified: new Date(),
            })
            .where(
                and(
                    eq(inventory.menuItemId, menuItemId),
                    eq(inventory.storeId, finalStoreId),
                    // Prevent discontinuing if already discontinued
                    ne(inventory.status, InventoryTransactionTypeEnum.DISCONTINUED),
                ),
            )
            .returning();

        if (!updatedInventory) {
            return handleError2(res, "Inventory record not found or already discontinued.", StatusCodes.NOT_FOUND);
        }

        // Log activity
        await logActivity({
            userId: userId,
            storeId: finalStoreId,
            action: "INVENTORY_DISCONTINUED",
            entityId: updatedInventory.id,
            entityType: "inventory",
            details: `Inventory for Menu Item ${menuItemId} marked as discontinued.`,
        });

        res.status(StatusCodes.OK).json(updatedInventory);
    } catch (error) {
        handleError2(
            res,
            "Problem marking inventory as discontinued, please try again.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @desc    Completely delete an inventory record for a menu item.
 * @route   DELETE /api/v1/inventory/:menuItemId
 * @access  Private (Admin/Highly Restricted)
 */
export const deleteInventoryRecord = async (req: CustomRequest, res: Response) => {
    try {
        const currentUser = req.user?.data;
        const storeId = currentUser?.storeId;
        const userId = currentUser?.id;
        const userRole = currentUser?.role;

        if (!storeId) {
            return handleError2(res, "You must be associated with a store.", StatusCodes.FORBIDDEN);
        }

        const { id: menuItemId } = req.params;
        const { targetStoreId } = req.query;

        if (!menuItemId) {
            return handleError2(res, "Menu item is required.", StatusCodes.BAD_REQUEST);
        }

        if (typeof menuItemId !== "string") {
            return handleError2(res, "Invalid menu item.", StatusCodes.BAD_REQUEST);
        }

        const finalStoreId = await determineFinalStoreId(
            res,
            userRole as UserRoleEnum,
            storeId,
            targetStoreId as string,
        );
        if (!finalStoreId) return; // Error already handled

        // Fetch the record before deleting to get the Inventory ID for logging
        const inventoryToDelete = await getInventoryByMenuItemId(menuItemId, finalStoreId);

        if (!inventoryToDelete) {
            return handleError2(res, "Inventory record not found.", StatusCodes.NOT_FOUND);
        }

        // The 'onDelete: cascade' on `inventory.menuItemId` in the schema
        // will automatically clean up the `inventory` record if the `menuItem` is deleted.
        // If we only delete the `inventory` record, we must manually delete transactions.

        // Since `inventory` references `menuItems` (cascade is set on the inventory side),
        // we assume deleting the `inventory` record is the intent here.
        // We will manually delete the transactions within a transaction for safety.

        await db.transaction(async (tx) => {
            // Delete all associated transactions first (if not cascading from the inventory table)
            // If `inventoryTransactions` does NOT cascade delete on `inventory.menuItemId` deletion, this step is needed:
            await tx
                .delete(inventoryTransactions)
                .where(
                    and(
                        eq(inventoryTransactions.menuItemId, menuItemId),
                        eq(inventoryTransactions.storeId, finalStoreId),
                    ),
                );

            // Delete the inventory record itself
            await tx
                .delete(inventory)
                .where(and(eq(inventory.menuItemId, menuItemId), eq(inventory.storeId, finalStoreId)))
                .returning();
        });

        // Log activity
        await logActivity({
            userId: userId,
            storeId: finalStoreId,
            action: "INVENTORY_RECORD_DELETED",
            entityId: inventoryToDelete.id, // Use the ID of the deleted inventory record
            entityType: "inventory",
            details: `Inventory record for Menu Item ${menuItemId} deleted permanently.`,
        });

        res.status(StatusCodes.OK).json({
            message: "Inventory record and all associated transactions deleted successfully.",
        });
    } catch (error) {
        handleError2(
            res,
            "Problem deleting inventory record, please try again.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @desc    Get inventory alerts for low stock items (raw materials and menu items)
 * @route GET /api/v1/inventory/alerts
 */
export const getInventoryAlerts = async (req: CustomRequest, res: Response) => {
    try {
        // Use your existing helper to get authorised store IDs
        const validated = await validateStoreAndExtractDates(req, res);
        if (!validated) return; // Error already handled by the helper

        const { storeIds, storeQueryType } = validated;

        const report = await InventoryAlertService.getUnifiedAlertReport(storeIds);

        return res.status(StatusCodes.OK).json({
            ...report,
            storeQueryType,
            totalAlertCount: report.rawMaterials.total + report.menuItems.total,
        });
    } catch (error: any) {
        return handleError2(
            res,
            "Failed to fetch Inventory Alerts",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @desc    Restore a discontinued inventory record to 'active'.
 * @route   PATCH /api/v1/inventory/continue/:menuItemId
 * @access  Private (Manager/Admin only)
 */
export const continueInventory = async (req: CustomRequest, res: Response) => {
    try {
        const currentUser = req.user?.data;
        const storeId = currentUser?.storeId;
        const userId = currentUser?.id;
        const userRole = currentUser?.role;

        if (!storeId) {
            return handleError2(res, "You must be associated with a store.", StatusCodes.FORBIDDEN);
        }

        const { id: menuItemId } = req.params;
        const { targetStoreId } = req.query;

        if (!menuItemId) {
            return handleError2(res, "Menu item is required.", StatusCodes.BAD_REQUEST);
        }

        if (typeof menuItemId !== "string") {
            return handleError2(res, "Invalid menu item.", StatusCodes.BAD_REQUEST);
        }

        const finalStoreId = await determineFinalStoreId(
            res,
            userRole as UserRoleEnum,
            storeId,
            targetStoreId as string,
        );
        if (!finalStoreId) return;

        const [updatedInventory] = await db
            .update(inventory)
            .set({
                status: InventoryTransactionTypeEnum.IN_STOCK,
                lastModified: new Date(),
            })
            .where(
                and(
                    eq(inventory.menuItemId, menuItemId),
                    eq(inventory.storeId, finalStoreId),
                    // Only update if it is currently discontinued
                    eq(inventory.status, InventoryTransactionTypeEnum.DISCONTINUED),
                ),
            )
            .returning();

        if (!updatedInventory) {
            return handleError2(
                res,
                "Inventory record not found or is not currently discontinued.",
                StatusCodes.NOT_FOUND,
            );
        }

        // Log activity
        await logActivity({
            userId: userId,
            storeId: finalStoreId,
            action: "INVENTORY_CONTINUED",
            entityId: updatedInventory.id,
            entityType: "inventory",
            details: `Inventory for Menu Item ${menuItemId} has been reactivated.`,
        });

        res.status(StatusCodes.OK).json(updatedInventory);
    } catch (error) {
        handleError2(
            res,
            "Problem reactivating inventory, please try again.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};
