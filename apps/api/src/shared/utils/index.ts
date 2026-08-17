export { default as helperUtil } from "./helper.util";

import { InventoryTransactionSummaryTypeEnum } from "../../types/enums";
import { LogParams } from "../../service/activity-service-log";

export const generateOrderReference = (length = 8) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "ORD-";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
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

type FormatDetailsParams = Pick<LogParams, "action" | "actorName" | "entityType" | "targetName" | "entityId" | "meta">;

export const formatActivityDetails = ({
    action,
    actorName,
    entityType,
    targetName,
    entityId,
    meta,
}: FormatDetailsParams): string => {
    if (action.endsWith("_CREATED")) {
        return `${actorName} created a new ${entityType}: ${targetName || entityId}.`;
    }
    if (action.endsWith("_DELETED")) {
        return `${actorName} deleted ${entityType}: ${targetName || entityId}.`;
    }
    if (action.includes("_UPDATED")) {
        const changes = meta ? ` (Changes: ${JSON.stringify(meta)})` : "";
        return `${actorName} updated ${entityType} ${targetName || entityId}${changes}.`;
    }
    if (action === "USER_LOGIN") {
        return `${actorName} logged into the system.`;
    }
    // Fallback for custom actions
    return `${actorName} performed ${action.replace(/_/g, " ").toLowerCase()} on ${entityType} ${targetName || entityId}.`;
};

// Calculate monthly bill based on active user count, with a cap at 45,000
export const calculateMonthlyBill = (activeUserCount: number): number => {
    const PRICE_PER_USER = 9000;
    const MAX_CAP = 45000;

    const total = activeUserCount * PRICE_PER_USER;

    // Return the total, but never more than 45,000
    return Math.min(total, MAX_CAP);
};
