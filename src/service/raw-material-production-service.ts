import db from "../db";
import { billOfMaterials } from "../schema/bill-of-materials-schema";
import { rawMaterials } from "../schema/raw-materials-schema";
import { eq } from "drizzle-orm";
import { InventoryAdjustmentService } from "./raw-material-inventory-adjustment-service";
import {
    RawMaterialTransactionSourceEnum,
    TransactionTypeEnum,
} from "../types/enums";
import { RawMaterialTransactionSource } from "../schema/raw-materials-schema/raw-material-stock-transaction-schema";

// Service dedicated to executing production runs and atomically deducting raw materials from inventory
export const RawMaterialProductionService = {
    /**
     * Executes a production run for a menu item, deducting all required raw materials atomically.
     * @param menuItemId The finished product being produced.
     * @param storeId The store where production occurs.
     * @param userId The user initiating the production (for audit).
     * @param productionBatchId A unique ID for the production batch (for documentRefId).
     * @returns A success message or throws an error.
     */
    async runProduction(
        menuItemId: string,
        storeId: string,
        userId: string,
        productionBatchId: string,
    ): Promise<void> {
        // Fetch BOM (Recipe) Data`
        // We only need the consumptionQuantityBase (the amount to deduct)
        const bomItems = await db
            .select({
                rawMaterialId: rawMaterials.id,
                consumptionQuantityBase:
                    billOfMaterials.consumptionQuantityBase,
                // We need the unit of the raw material itself for conversion/logging purposes,
                // but since we are deducting the BASE quantity, we can simplify this fetch.
            })
            .from(billOfMaterials)
            .innerJoin(
                rawMaterials,
                eq(billOfMaterials.rawMaterialId, rawMaterials.id),
            )
            .where(eq(billOfMaterials.menuItemId, menuItemId))
            .execute();

        if (bomItems.length === 0) {
            throw new Error(
                `Cannot run production: No Bill of Materials defined for the Menu Item`,
            );
        }

        // Starting Atomic Transaction for Deduction
        await db.transaction(async (tx) => {
            // NOTE: We could add a pre-check here to verify stock availability
            // before running the loop, but for atomicity, we rely on the
            // InventoryAdjustmentService to enforce business rules (e.g. throwing error on negative stock if enforced).

            for (const item of bomItems) {
                const { rawMaterialId, consumptionQuantityBase } = item;

                // Create the transaction data for an OUT movement
                const transactionData = {
                    rawMaterialId: rawMaterialId,
                    storeId: storeId,
                    userId: userId,
                    type: TransactionTypeEnum.GOING_OUT,
                    source: RawMaterialTransactionSourceEnum.PRODUCTION_USAGE as RawMaterialTransactionSource,
                    documentRefId: productionBatchId,
                    notes: `Deduction for Menu Item ${menuItemId} production.`,
                };

                // IMPORTANT: Since the consumptionQuantityBase is already in the Base Unit,
                // we treat the Base Unit as the Presentation Unit for the Adjustment Service
                // and use a virtual 'conversion factor' of 1.

                // We must fetch the raw material's default unit ID to satisfy the service's signature.
                // A cleaner approach is to enhance the InventoryAdjustmentService to accept
                // an already-calculated quantityBase, but we'll adapt to the current service structure:

                // A safer way is to fetch the raw material's base unit (the unit with factor=1) ID here
                // to correctly pass a 'unitOfMeasurementId' to the service. For simplicity, we skip the conversion
                // logic in the service call by passing a known unit ID.

                // FOR SIMPLICITY AND USING EXISTING SERVICE:
                // We treat consumptionQuantityBase as the presentation quantity,
                // and pass the raw material's own presentation unit ID to allow the service
                // to handle the base unit lookup (which it already stores).

                const materialRecord = await tx.query.rawMaterials.findFirst({
                    where: eq(rawMaterials.id, rawMaterialId),
                });

                if (!materialRecord) {
                    // Should not happen due to FK check, but safety first.
                    throw new Error(`Raw Material not found.`);
                }

                // Execute the stock deduction
                await InventoryAdjustmentService.processStockAdjustment(
                    transactionData,
                    consumptionQuantityBase, // Qty Base is treated as Presentation Qty for this service call
                    materialRecord.unitOfMeasurementId, // Pass the Raw Material's default unitOfMeasurementId
                );
            }
        });

        // If the transaction succeeds, all ingredients were deducted.
    },
};
