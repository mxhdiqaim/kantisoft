import {extendBaseSchema, type LocalSyncStatus} from "@/types";
import * as yup from "yup";

export const InventoryStatusEnum = {
    IN_STOCK: "inStock",
    LOW_STOCK: "lowStock",
    OUT_OF_STOCK: "outOfStock",
    ADJUSTMENT: "adjustment",
    DISCONTINUED: "discontinued",
} as const;
export const INVENTORY_STATUS = Object.values(InventoryStatusEnum);

export const TransactionTypeEnum = {
    SALE: "sale",
    RETURN: "return",
    WASTE: "waste",
    ADJUSTMENT_IN: "adjustmentIn",
    ADJUSTMENT_OUT: "adjustmentOut",
    PURCHASE_RECEIVE: "purchaseReceive",
    // COMING_IN: "comingIn",
    // GOING_OUT: "goingOut",
} as const;
export const TRANSACTION_TYPE = Object.values(TransactionTypeEnum);

export const StockAdjustmentTypeEnum = {
    RETURN: "return",
    ADJUSTMENT_IN: "adjustmentIn",
    PURCHASE_RECEIVE: "purchaseReceive",
    COMING_IN: "comingIn",
} as const;

export const STOCK_ADJUSTMENT_TYPE = Object.values(StockAdjustmentTypeEnum);

// Schema for creating an inventory item
export const createInventorySchema = yup.object({
    menuItemId: yup.string().uuid().required("MenuItem not selected"),
    quantity: yup.number().required("Quantity is required").min(0, "Quantity must be at least 0"),
    minStockLevel: yup.number().required("Minimum stock level is required").min(0, "Minimum stock level must be 0 or greater"),
});

export const adjustStockSchema = yup.object({
    menuItemId: yup.string().uuid().required("MenuItem not selected"),
    quantityAdjustment: yup.number().integer().required("Quantity adjustment is required").typeError("Quantity adjustment must be a number"),
    transactionType: yup.string().oneOf(TRANSACTION_TYPE).default("adjustmentIn").required("Transaction type is required"),
    notes: yup.string().optional(),
})

export type InventoryType = {
    menuItemId: string;
    storeId: string;
    quantity: number;
    minStockLevel?: number;
    status: (typeof INVENTORY_STATUS)[number];
    lastCountDate?: string | null;
    menuItem?: {
        name: string;
        itemCode: string;
        sku?: string;
    };
    store?: {
        name: string;
    };
};

export const inventoryTransactionSchema = extendBaseSchema({
    menuItemId: yup.string().uuid().required("MenuItem not selected"),
    storeId: yup.string().uuid().required("Store not selected"),
    transactionType: yup.string().oneOf(TRANSACTION_TYPE).required("Transaction type is required"),
    quantityChange: yup.number().required("Quantity change is required"),
    resultingQuantity: yup.number().required("Resulting quantity is required"),
    sourceDocumentId: yup.string().optional().nullable(),
    performedBy: yup.string().uuid().required("Performed by is required"),
    notes: yup.string().optional(),
    transactionDate: yup.string().required("Transaction date is required"),
    performedByUser: yup
        .object({
            firstName: yup.string().required(),
            lastName: yup.string().required(),
        })
        .optional(),
    menuItem: yup
        .object({
            name: yup.string().required(),
            itemCode: yup.string().required(),
        })
        .optional(),
});

export type InventoryTransactionsType = {
    id: string;
    itemName: string;
    label: string;
    notes?: string;
    performedBy: string;
    quantity: number;
    storeName: string;
    transactionDate: string;
    type: (typeof TRANSACTION_TYPE)[number];
    createdAt: string;
}

export type InventoryTransactionResponseType = {
    startDate: string;
    endDate: string;
    timePeriod: string;
    storeQueryType: string;
    transactions: InventoryTransactionsType[];
};

export type CreateInventoryType = yup.InferType<typeof createInventorySchema>;
export type AdjustStockType = yup.InferType<typeof adjustStockSchema>;
export type AdjustStockResponseType = Omit<InventoryType, "menuItem" | "store">;
export type InventoryTransactionType = yup.InferType<typeof inventoryTransactionSchema>;

export type InventoryValuationHealthType = {
    timePeriod: string;
    startDate: string;
    endDate: string;
    totalInventoryValue: string;
    totalTrackedItems: number;
    inStockItemsCount: number;
    outOfStockItemsCount: number;
    stockedItemsPercentage: string;
    storeQueryType: string;
};

export type LocalInventoryTypee = InventoryType & {
    syncStatus: LocalSyncStatus;
};