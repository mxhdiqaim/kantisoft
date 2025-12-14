import db from "../db";
import { billOfMaterials } from "../schema/bill-of-materials-schema";
import { rawMaterials } from "../schema/raw-materials-schema";
import { eq } from "drizzle-orm";

// Service dedicated to calculating the current raw material cost of a finished menu item.
export const MenuItemCostingService = {
    /**
     * Calculates the total raw material cost for a single menu item based on current raw material prices.
     * @param menuItemId The ID of the menu item (finished product).
     * @returns The total raw material cost (number) or null if no BOM is defined.
     */
    async calculateTotalRawMaterialCost(
        menuItemId: string,
    ): Promise<number | null> {
        // Fetch BOM data with current Raw Material Price
        // We only need the consumption quantity (Base) and the latest price (Base) for the calculation.
        const results = await db
            .select({
                consumptionQuantityBase:
                    billOfMaterials.consumptionQuantityBase,
                latestUnitPriceBase: rawMaterials.latestUnitPrice,
            })
            .from(billOfMaterials)
            .innerJoin(
                rawMaterials,
                eq(billOfMaterials.rawMaterialId, rawMaterials.id),
            )
            .where(eq(billOfMaterials.menuItemId, menuItemId))
            .execute();

        if (results.length === 0) {
            return null; // Return null if no recipe (BOM) is defined
        }

        // Cost Calculation and Aggregation
        let totalCost = 0;

        for (const item of results) {
            // Formula: Cost = Consumption Quantity (Base) * Latest Price (Base)
            const ingredientCost =
                item.consumptionQuantityBase * item.latestUnitPriceBase;

            // Note: We use standard number addition here. If high-precision financial
            // arithmetic is strictly required (e.g. preventing floating point errors),
            // we might switch to a library like 'big.js' or 'decimal.js'.
            totalCost += ingredientCost;
        }

        // Round to two or four decimal places for financial data accuracy, depending on your currency/rules
        return parseFloat(totalCost.toFixed(4));
    },

    // Other methods here, like:
    // async calculateCostAtDate(menuItemId: string, date: Date) { ... } // For historical costing
};
