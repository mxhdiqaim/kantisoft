export enum UserRoleEnum {
    MANAGER = "manager",
    ADMIN = "admin",
    USER = "user",
    GUEST = "guest",
}

export const UserStatusEnum = {
    ACTIVE: "active",
    INACTIVE: "inactive",
    DELETED: "deleted",
    BANNED: "banned",
} as const;

export enum OrderStatusEnum {
    CANCELED = "canceled",
    PENDING = "pending",
    COMPLETED = "completed",
    DELETED = "deleted",
}

export enum OrderPaymentMethodEnum {
    CARD = "card",
    CASH = "cash",
    TRANSFER = "transfer",
}

export const InventoryTransactionTypeEnum = {
    IN_STOCK: "inStock",
    LOW_STOCK: "lowStock",
    OUT_OF_STOCK: "outOfStock",
    ADJUSTMENT: "adjustment",
    DISCONTINUED: "discontinued",
} as const;

export const INVENTORY_TRANSACTION_TYPES = Object.values(
    InventoryTransactionTypeEnum,
);

export const InventoryTransactionSummaryTypeEnum = {
    SALE: "sale",
    RETURN: "return",
    WASTE: "waste",
    ADJUSTMENT_IN: "adjustmentIn",
    ADJUSTMENT_OUT: "adjustmentOut",
    PURCHASE_RECEIVE: "purchaseReceive",
} as const;

export const UnitOfMeasurementFamilyEnum = {
    WEIGHT: "weight",
    VOLUME: "volume",
    COUNT: "count",
    AREA: "area",
    LENGTH: "length",
};

export const RawMaterialStatusEnum = {
    ACTIVE: "active",
    DELETED: "deleted",
    ARCHIVED: "archived",
} as const;

export const RawMaterialTransactionTypeEnum = {
    COMING_IN: "comingIn",
    GOING_OUT: "goingOut",
} as const;
export const RAW_MATERIAL_TRANSACTION_TYPES = Object.values(
    RawMaterialTransactionTypeEnum,
);

export const RawMaterialTransactionSourceEnum = {
    PURCHASE_RECEIPT: "purchaseReceipt",
    PRODUCTION_USAGE: "productionUsage",
    INVENTORY_ADJUSTMENT: "inventoryAdjustment",
    WASTAGE: "wastage",
    TRANSFER_IN: "transferIn",
    TRANSFER_OUT: "transferOut",
    PRODUCTION_CONSUMPTION: "productionConsumption",
};
export const RAW_MATERIAL_TRANSACTION_SOURCES = Object.values(
    RawMaterialTransactionSourceEnum,
);

export const INVENTORY_TRANSACTION_SUMMARY_TYPES = Object.values(
    InventoryTransactionSummaryTypeEnum,
);
