import db from "../db";
import {rawMaterials} from "../schema/raw-materials-schema";
import {rawMaterialInventory} from "../schema/raw-materials-schema/raw-material-inventory-schema";
import {and, eq, inArray, sql} from "drizzle-orm";
import {menuItems} from "../schema/menu-items-schema";
import {inventory} from "../schema/inventory-schema";

/**
 * @description Scans both Raw Materials and Menu Items for low stock levels.
 */
export const InventoryAlertService = {
    async getUnifiedAlertReport(storeIds: string[]) {
        // Raw Materials Queries
        const rawMaterialsAlerts = await db
            .select({
                id: rawMaterials.id,
                name: rawMaterials.name,
                currentStock: rawMaterialInventory.quantity,
                threshold: rawMaterialInventory.minStockLevel,
                status: rawMaterialInventory.status, // 'lowStock' or 'outOfStock'
                storeId: rawMaterialInventory.storeId,
            })
            .from(rawMaterialInventory)
            .innerJoin(
                rawMaterials,
                eq(rawMaterialInventory.rawMaterialId, rawMaterials.id),
            )
            .where(
                and(
                    inArray(rawMaterialInventory.storeId, storeIds),
                    // Capture both low and out of stock
                    sql`${rawMaterialInventory.status}
                    IN ('lowStock', 'outOfStock')`,
                ),
            );

        // Menu Items Queries
        const menuItemsAlerts = await db
            .select({
                id: menuItems.id,
                name: menuItems.name,
                currentStock: inventory.quantity,
                threshold: inventory.minStockLevel,
                status: inventory.status, // 'lowStock' or 'outOfStock'
                storeId: inventory.storeId,
            })
            .from(inventory)
            .innerJoin(menuItems, eq(inventory.menuItemId, menuItems.id))
            .where(
                and(
                    inArray(inventory.storeId, storeIds),
                    sql`${inventory.status}
                    IN ('lowStock', 'outOfStock')`,
                ),
            );

        // Categorize for easy frontend consumption
        return {
            rawMaterials: {
                outOfStock: rawMaterialsAlerts.filter(
                    (i) => i.status === "outOfStock",
                ),
                lowStock: rawMaterialsAlerts.filter(
                    (i) => i.status === "lowStock",
                ),
                total: rawMaterialsAlerts.length,
            },
            menuItems: {
                outOfStock: menuItemsAlerts.filter(
                    (i) => i.status === "outOfStock",
                ),
                lowStock: menuItemsAlerts.filter(
                    (i) => i.status === "lowStock",
                ),
                total: menuItemsAlerts.length,
            },
            timestamp: new Date(),
        };
    },
};
