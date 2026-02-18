import { InventoryTransactionSummaryTypeEnum } from "../types/enums";

export const generateOrderReference = (length = 8) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "ORD-";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export const getEnvVariable = (key: string): string => {
    const value = process.env[key];

    if (!value) {
        throw new Error(`Environment variable is missing: ${key}`);
    }

    return value;
};

/**
 * Generates a clean, readable SKU.
 * Example: "Drink", "Coca-Cola 500 ml" -> "DRK-COCA-500ML"
 */
export const generateSKU = (categoryName: string, itemName: string): string => {
    // Get the first 3 letters of the category (e.g. "Drinks" -> "DRK")
    const catPrefix =
        categoryName
            .replace(/[aeiou]/gi, "") // Remove vowels for better abbreviation
            .substring(0, 3)
            .toUpperCase() || "GEN";

    // Get the first 2 words of the item name
    const itemParts = itemName
        .split(" ")
        .filter((word) => word.length > 1)
        .map((word) => word.substring(0, 4).toUpperCase());

    const itemPrefix = itemParts.slice(0, 2).join("-");

    // add a small random suffix to ensure uniqueness before DB check
    const randomSuffix = Math.floor(100 + Math.random() * 900);

    return `${catPrefix}-${itemPrefix}-${randomSuffix}`;
};

/**
 * Helper to generate human-readable labels for transaction types
 */
export const getInventoryTransactionTypeLabel = (type: string) => {
    switch (type) {
        case InventoryTransactionSummaryTypeEnum.SALE:
            return "Sale (Stock Decrease)";
        case InventoryTransactionSummaryTypeEnum.PRODUCTION_IN:
            return "Production (Stock Increase)";
        case InventoryTransactionSummaryTypeEnum.ADJUSTMENT_IN:
            return "Manual Adjustment (Increase)";
        case InventoryTransactionSummaryTypeEnum.ADJUSTMENT_OUT:
            return "Loss/Wastage (Decrease)";
        case InventoryTransactionSummaryTypeEnum.PURCHASE_RECEIVE:
            return "Purchase Received (Increase)";
        default:
            return type;
    }
};
