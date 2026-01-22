import db from "../db";
import {rawMaterials} from "../schema/raw-materials-schema";
import {rawMaterialInventory} from "../schema/raw-materials-schema/raw-material-inventory-schema";
import {and, eq, sql} from "drizzle-orm";
import {menuItems} from "../schema/menu-items-schema";
import {inventory} from "../schema/inventory-schema";

/**
 * @description Scans both Raw Materials and Menu Items for low stock levels.
 */
export const InventoryAlertService = {
    async getLowStockReport(storeId: string) {
        // Check Raw Materials (The "Shopping List")
        const lowRawMaterials = await db
            .select({
                name: rawMaterials.name,
                currentStock: rawMaterialInventory.quantity,
                threshold: rawMaterialInventory.minStockLevel,
                status: rawMaterialInventory.status,
            })
            .from(rawMaterialInventory)
            .innerJoin(
                rawMaterials,
                eq(rawMaterialInventory.rawMaterialId, rawMaterials.id),
            )
            .where(
                and(
                    eq(rawMaterialInventory.storeId, storeId),
                    sql`${rawMaterialInventory.quantity}
                    <=
                    ${rawMaterialInventory.minStockLevel}`,
                ),
            );

        // Check Menu Items (The "Cooking List")
        const lowMenuItems = await db
            .select({
                name: menuItems.name,
                currentStock: inventory.quantity,
                threshold: inventory.minStockLevel,
                status: inventory.status,
            })
            .from(inventory)
            .innerJoin(menuItems, eq(inventory.menuItemId, menuItems.id))
            .where(
                and(
                    eq(inventory.storeId, storeId),
                    sql`${inventory.quantity}
                    <=
                    ${inventory.minStockLevel}`,
                ),
            );

        return {
            rawMaterialsToBuy: lowRawMaterials,
            menuItemsToProduce: lowMenuItems,
            timestamp: new Date(),
        };
    },
};
