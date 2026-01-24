/* eslint-disable @typescript-eslint/no-explicit-any */
import db from "../db";
import { rawMaterialInventory } from "../schema/raw-materials-schema/raw-material-inventory-schema";
import {
    InsertRawMaterialTransactionSchemaT,
    rawMaterialTransactions,
} from "../schema/raw-materials-schema/raw-material-stock-transaction-schema";
import { UnitConversionService } from "./unit-conversion-service";
import { and, eq, sql } from "drizzle-orm";
import { calculateInventoryStatus } from "../helpers";
import { inventory } from "../schema/inventory-schema";
import { InventoryTransactionSummaryTypeEnum, InventoryTransactionTypeEnum, TRANSACTION_TYPES } from "../types/enums";
import { inventoryTransactions } from "../schema/inventory-schema/inventory-transaction-schema";
import { rawMaterials } from "../schema/raw-materials-schema";

/**
 * Service to handle all atomic inventory adjustments (IN or OUT).
 */
export const InventoryAdjustmentService = {
    /**
     * Executes an atomic inventory update, logging the transaction and updating the inventory Master record.
     * @param transaction The raw transaction data from the controller.
     * @param quantityPresentation The quantity the user entered (e.g. 10 kg).
     * @param unitOfMeasurementId The ID of the unit used in the transaction.
     * @returns The updated raw material inventory record.
     */
    async processStockAdjustment(
        transaction: Omit<
            InsertRawMaterialTransactionSchemaT,
            "quantityBase" | "createdAt" | "id" | "lastModified"
        >,
        quantityPresentation: number,
        unitOfMeasurementId: string,
    ) {
        // Fetch Unit and Calculate Base Quantity
        const unitRecord =
            await UnitConversionService.fetchUnitById(unitOfMeasurementId);

        if (!unitRecord) {
            throw new Error(`Unit of measurement not found.`);
        }

        // Convert the user's quantity (e.g. 10 kg) into the Base Unit (e.g. 10,000 g)
        const quantityBase = UnitConversionService.convertToBaseUnit(
            quantityPresentation,
            unitRecord,
        );

        // Determine Sign for Update
        // Inventory transactions are signed: '+' for 'in', '-' for 'out'.
        const quantityChange =
            transaction.type === "comingIn" ? quantityBase : -quantityBase;

        // Start Atomic Transaction (Drizzle Transaction)
        return db.transaction(async (tx) => {
            // a. Record the Stock Transaction (Ledger Entry)
            await tx
                .insert(rawMaterialTransactions)
                .values({
                    ...transaction,
                    quantityBase: quantityBase, // Always positive in the log, the 'type' field indicates direction
                })
                .returning();

            // b. Atomically Update the Inventory Master Record
            const [updatedRecord] = await tx
                .update(rawMaterialInventory)
                .set({
                    quantity: sql`${rawMaterialInventory.quantity}
                    +
                    ${quantityChange}`, // Add or Subtract the Base Unit quantity
                    lastModified: new Date(),
                })
                .where(
                    and(
                        eq(
                            rawMaterialInventory.rawMaterialId,
                            transaction.rawMaterialId,
                        ),
                        eq(rawMaterialInventory.storeId, transaction.storeId),
                    ),
                )
                .returning();

            if (!updatedRecord) {
                // Check if the inventory record exists before attempting update
                throw new Error(
                    "Raw Material Inventory record does not exist in this store.",
                );
            }

            // Re-determine and Update Inventory Status (Low Stock/Out of Stock)
            // const updatedRecord = inventoryUpdate[0];
            const newQuantity = updatedRecord.quantity;
            const minStockLevel = updatedRecord.minStockLevel;

            const newStatus = calculateInventoryStatus(
                newQuantity,
                minStockLevel,
            );

            if (newStatus !== updatedRecord.status) {
                // Perform a final update to set the new status
                await tx
                    .update(rawMaterialInventory)
                    .set({ status: newStatus })
                    .where(eq(rawMaterialInventory.id, updatedRecord.id));

                updatedRecord.status = newStatus; // Update the returned object
            }

            return updatedRecord; // Return the final, updated inventory record
        });
    },

    /**
     * Deducts raw material stock during production.
     * Uses an existing transaction (tx) to ensure atomicity.
     */
    async processRawMaterialStockOut(
        tx: any, // Use the Drizzle transaction type here
        data: {
            rawMaterialId: string;
            storeId: string;
            type: (typeof TRANSACTION_TYPES)[number];
            userId: string;
            source: string;
            quantityBase: number;
            documentRefId: string;
            notes: string;
        },
    ) {
        // 1. Get the material name using Standard API to avoid the 'referencedTable' error
        const [materialInfo] = await tx
            .select({ name: rawMaterials.name })
            .from(rawMaterials)
            .where(eq(rawMaterials.id, data.rawMaterialId))
            .limit(1);

        // Update Inventory Master FIRST to get the new total
        const [updated] = await tx
            .update(rawMaterialInventory)
            .set({
                quantity: sql`${rawMaterialInventory.quantity}
                -
                ${data.quantityBase}`,
                lastModified: new Date(),
            })
            .where(
                and(
                    eq(rawMaterialInventory.rawMaterialId, data.rawMaterialId),
                    eq(rawMaterialInventory.storeId, data.storeId),
                ),
            )
            .returning();

        // Material doesn't even exist in the warehouse
        if (!updated) {
            throw new Error(
                `Inventory Error: ${materialInfo?.name || "Material"} is not stocked in this store.`,
            );
        }

        // The "Insufficient Stock" Guard
        if (updated.quantity < 0) {
            // We calculate the deficit to be helpful
            // const missingAmount = Math.abs(updated.quantity);
            throw new Error(
                `Insufficient Stock: You are short on ${materialInfo?.name || "Material"}`,
            );
        }

        // Record Transaction Log only if stock was enough
        await tx.insert(rawMaterialTransactions).values({
            rawMaterialId: data.rawMaterialId,
            storeId: data.storeId,
            type: data.type,
            userId: data.userId,
            source: data.source,
            quantityBase: data.quantityBase,
            documentRefId: data.documentRefId,
            notes: data.notes,
        });

        // Update Status (Low stock check)
        const newStatus = calculateInventoryStatus(
            updated.quantity,
            updated.minStockLevel,
        );

        if (newStatus !== updated.status) {
            await tx
                .update(rawMaterialInventory)
                .set({ status: newStatus })
                .where(eq(rawMaterialInventory.id, updated.id));
        }
    },

    /**
     * Adds finished goods (Menu Items) to inventory after production.
     */
    async processMenuItemStockIn(
        tx: any,
        data: {
            menuItemId: string;
            storeId: string;
            quantity: number;
            notes: string;
            performedBy?: string;

            // type: typeof TransactionTypeEnum;
            // source: typeof MenuItemTransactionSourceEnum;
        },
    ) {
        // Log the transaction in your existing 'inventoryTransactions' table
        await tx.insert(inventoryTransactions).values({
            menuItemId: data.menuItemId,
            storeId: data.storeId,
            transactionType: InventoryTransactionSummaryTypeEnum.PRODUCTION_IN, // Using the new enum value
            quantityChange: data.quantity, // Positive number for stock in
            performedBy: data.performedBy,
            notes: data.notes || "Production Batch Completed",
        });

        // Update the 'inventory' table primary record
        const [updatedRecord] = await tx
            .update(inventory)
            .set({
                quantity: sql`${inventory.quantity}
                +
                ${data.quantity}`,
                lastModified: new Date(),
            })
            .where(
                and(
                    eq(inventory.menuItemId, data.menuItemId),
                    eq(inventory.storeId, data.storeId),
                ),
            )
            .returning();

        // Handle status updates (Low Stock logic)
        if (updatedRecord) {
            const newStatus = calculateInventoryStatus(
                updatedRecord.quantity,
                updatedRecord.minStockLevel,
            );

            if (newStatus !== updatedRecord.status) {
                await tx
                    .update(inventory)
                    .set({ status: newStatus })
                    .where(eq(inventory.id, updatedRecord.id));
            }
        } else {
            // Optional: If no inventory record exists yet, create one
            await tx.insert(inventory).values({
                menuItemId: data.menuItemId,
                storeId: data.storeId,
                quantity: data.quantity,
                status: InventoryTransactionTypeEnum.IN_STOCK,
            });
        }
    },
};
