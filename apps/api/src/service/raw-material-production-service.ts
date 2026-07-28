import db from "../shared/database";
import { billOfMaterials } from "../schema/bill-of-materials-schema";
import { rawMaterials } from "../schema/raw-materials-schema";
import { and, eq } from "drizzle-orm";
import { RawMaterialInventoryService } from "./raw-material-inventory-service";
import {
    RawMaterialTransactionSourceEnum,
    TransactionTypeEnum,
} from "../types/enums";
import { menuItems } from "../schema/menu-items-schema";
import { productions } from "../schema/production-schema";

// Service dedicated to executing production runs and atomically deducting raw materials from inventory
export const RawMaterialProductionService = {
    /**
     * Executes a production run for a menu item, deducting all required raw materials atomically.
     * @param menuItemId The finished product being produced.
     * @param storeId The store where production occurs.
     * @param userId The user initiating the production (for audit).
     * @param productionBatchId A unique ID for the production batch (for documentRefId).
     * @param quantityToProduce The number of finished product units to produce.
     * @returns A success message or throws an error.
     */
    async runProduction(
        menuItemId: string,
        storeId: string,
        userId: string,
        productionBatchId: string,
        quantityToProduce: number,
    ): Promise<void> {
        // Fetch BOM with current Raw Material Prices to calculate cost
        const bomItems = await db
            .select({
                rawMaterialId: rawMaterials.id,
                latestUnitPrice: rawMaterials.latestUnitPrice,
                consumptionQuantityBase:
                    billOfMaterials.consumptionQuantityBase,
                itemName: menuItems.name,
                itemPrice: menuItems.price,
            })
            .from(billOfMaterials)
            .innerJoin(
                rawMaterials,
                eq(billOfMaterials.rawMaterialId, rawMaterials.id),
            )
            .innerJoin(menuItems, eq(billOfMaterials.menuItemId, menuItems.id))
            .where(
                and(
                    eq(billOfMaterials.menuItemId, menuItemId),
                    eq(menuItems.storeId, storeId),
                ),
            );

        if (bomItems.length === 0)
            throw new Error(`No Bill of Materials defined for this Menu Item`);

        // Calculate totals for the Production record
        let totalBatchCost = 0;
        const potentialRevenue =
            parseFloat(bomItems[0].itemPrice) * quantityToProduce;

        // Starting Atomic Transaction for Deduction
        await db.transaction(async (tx) => {
            // Create the Production Header Record
            const [productionRecord] = await tx
                .insert(productions)
                .values({
                    batchReference: productionBatchId,
                    menuItemId,
                    storeId,
                    quantityProduced: quantityToProduce,
                    performedBy: userId,
                    potentialRevenue: potentialRevenue,
                    // We'll update totalBatchCost after calculating in the loop
                })
                .returning();

            for (const item of bomItems) {
                const totalNeededBase =
                    item.consumptionQuantityBase * quantityToProduce;
                const ingredientCost =
                    (item.latestUnitPrice || 0) * totalNeededBase;
                totalBatchCost += ingredientCost;

                // Deduct Raw Materials
                await RawMaterialInventoryService.processRawMaterialStockOut(
                    tx,
                    {
                        rawMaterialId: item.rawMaterialId,
                        storeId,
                        userId,
                        type: TransactionTypeEnum.GOING_OUT,
                        source: RawMaterialTransactionSourceEnum.PRODUCTION_USAGE,
                        quantityBase: totalNeededBase,
                        documentRefId: productionRecord.id, // Reference the NEW production table ID
                        notes: `Production of ${bomItems[0].itemName}`,
                    },
                );
            }

            // Update Header with the calculated total cost
            await tx
                .update(productions)
                .set({ totalIngredientCost: totalBatchCost })
                .where(eq(productions.id, productionRecord.id));

            // Add Finished Menu Items to Inventory
            await RawMaterialInventoryService.processMenuItemStockIn(tx, {
                menuItemId,
                storeId,
                quantity: quantityToProduce,
                notes: `Batch: ${productionBatchId}`,
                performedBy: userId,
                // Pass productionRecord.id as sourceDocumentId inside the adjustment service
            });
        });
    },
};
