import Dexie, {type Table} from 'dexie';
import type {LocalCategoryType} from "@/types/categories-types.ts";
import type {LocalMenuItemType} from "@/types/menu-item-type.ts";

export class OfflineDatabase extends Dexie {
    categories!: Table<LocalCategoryType>;
    menuItems!: Table<LocalMenuItemType>;

    constructor() {
        super('KantiSoftOfflineDB');
        this.version(1).stores({
            // The primary key is 'id'. We index fields used in 'where' clauses.
            categories: 'id, name, description, storeId, syncStatus',
            menuItems: 'id, name, description, itemCode, sku, price, categoryId, storeId, store, inventory, syncStatus'
        });
    }
}

export const localDb = new OfflineDatabase();