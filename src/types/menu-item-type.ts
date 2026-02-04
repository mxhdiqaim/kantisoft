import * as yup from "yup";
import {type BaseSchema, type LocalSyncStatus} from "@/types";

export const createMenuItemSchema = yup.object({
    name: yup.string().required("Name is required").min(2, "Name must be at least 2 characters"),
    categoryId: yup.string().uuid().required("Category is required").typeError("Category must be selected"),
    itemCode: yup.number().optional().min(100, "Item code must be at least 100"),
    sku: yup.string().optional().typeError("SKU must be a string"),
    price: yup
        .number()
        .typeError("Price must be a number")
        .positive("Price must be greater than 0")
        .required("Price is required"),
});

export type CreateMenuItemType = yup.InferType<typeof createMenuItemSchema>;
export type EditMenuItemType = Partial<CreateMenuItemType>;

export const MenuItemInventoryStatusEnum = {
    IN_STOCK: "inStock",
    OUT_OF_STOCK: "outOfStock",
    LOW_STOCK: "lowStock",
} as const;

export const INVENTORY_STATUS_VALUES = Object.values(MenuItemInventoryStatusEnum);

export type MenuItemInventoryType = (typeof INVENTORY_STATUS_VALUES)[number];

// Inferred type for a full menu item object
export interface MenuItemType extends BaseSchema {
    name: string;
    description?: string;
    itemCode?: number;
    sku?: string;
    price: number | string;
    categoryId: string;
    storeId: string;
    store: {
        name: string;
    };
    inventory?: {
        quantity: number;
        status: MenuItemInventoryType;
        minStockLevel?: number;
        lastCountDate: string;
    }
};

export type LocalMenuItemType = Omit<MenuItemType, "createdAt" | "lastModified"> & {
    syncStatus: LocalSyncStatus;
};
