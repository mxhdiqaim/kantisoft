import Dexie, {type Table} from 'dexie';
import type {LocalCategoryType} from "@/types/categories-types.ts";
import type {LocalMenuItemType} from "@/types/menu-item-type.ts";
import type {LocalInventoryTypee} from "@/types/inventory-types.ts";

export class OfflineDatabase extends Dexie {
    categories!: Table<LocalCategoryType>;
    menuItems!: Table<LocalMenuItemType>;
    inventory!: Table<LocalInventoryTypee>; // Add this

    constructor() {
        super('KantiSoftOfflineDB');
        this.version(2).stores({
            // The primary key is 'id'. We index fields used in 'where' clauses.
            categories: 'id, name, storeId, syncStatus',
            menuItems: 'id, name, sku, storeId, syncStatus',
            inventory: 'menuItemId, status, syncStatus'
        });
    }
}

export const localDb = new OfflineDatabase();