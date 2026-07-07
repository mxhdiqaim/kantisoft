import db from "../shared/database";
import { and, eq } from "drizzle-orm";
import { inventory } from "../schema/inventory-schema";
import { billOfMaterials } from "../schema/bill-of-materials-schema";
import { rawMaterials } from "../schema/raw-materials-schema";

export type StockStatus = "inStock" | "lowStock" | "outOfStock";

// Helper function to check stock existence and authorisation
export const getInventoryByMenuItemId = async (
    menuItemId: string,
    storeId: string,
) => {
    return db.query.inventory.findFirst({
        where: and(
            eq(inventory.menuItemId, menuItemId),
            eq(inventory.storeId, storeId),
        ),
        with: { menuItem: { columns: { name: true, itemCode: true } } },
    });
};

export const calculateInventoryStatus = (
    quantity: number,
    minStockLevel: number,
): StockStatus => {
    if (quantity <= 0) return "outOfStock";
    if (quantity <= minStockLevel) return "lowStock";

    return "inStock";
};

/**
 * @description Calculates the current total cost of a Menu Item based on its BOM
 * and the latest Raw Material purchase prices.
 */
export const calculateMenuItemCost = async (
    menuItemId: string,
    storeId: string,
) => {
    const ingredients = await db
        .select({
            qtyBase: billOfMaterials.consumptionQuantityBase,
            priceBase: rawMaterials.latestUnitPrice, // Price per gram/ml
        })
        .from(billOfMaterials)
        .innerJoin(
            rawMaterials,
            eq(billOfMaterials.rawMaterialId, rawMaterials.id),
        )
        .where(
            and(
                eq(billOfMaterials.menuItemId, menuItemId),
                eq(billOfMaterials.storeId, storeId),
            ),
        );

    // Sum up the cost of every ingredient
    return ingredients.reduce((acc, item) => {
        return acc + item.qtyBase * (item.priceBase || 0);
    }, 0);
};
