import { ActivityActionType } from "../schema/activity-log-schema";
import { logActivity } from "./activity-logger";

interface LogParams {
    userId: string;
    storeId: string;
    entityId: string;
    entityType:
        | "order"
        | "menuItem"
        | "user"
        | "store"
        | "inventory"
        | "rawMaterial"
        | "rawMaterialInventory";
    action: ActivityActionType;
    actorName: string; // The person performing the action
    targetName?: string; // The name of the item being changed (e.g. "Flour")
    meta?: Record<string, unknown>; // For "Old vs New" data
}

export const ActivityLogService = {
    async logSystemEvent({
        userId,
        storeId,
        entityId,
        entityType,
        action,
        actorName,
        targetName,
        meta,
    }: LogParams) {
        let details = "";

        // Auto-format details based on action patterns
        if (action.endsWith("_CREATED")) {
            details = `${actorName} created a new ${entityType}: ${targetName || entityId}.`;
        } else if (action.endsWith("_DELETED")) {
            details = `${actorName} deleted ${entityType}: ${targetName || entityId}.`;
        } else if (action.includes("_UPDATED")) {
            const changes = meta ? ` (Changes: ${JSON.stringify(meta)})` : "";
            details = `${actorName} updated ${entityType} ${targetName || entityId}${changes}.`;
        } else if (action === "USER_LOGIN") {
            details = `${actorName} logged into the system.`;
        } else {
            // Fallback for custom actions like MINIMUM_STOCK_LEVEL_UPDATED
            details = `${actorName} performed ${action.replace(/_/g, " ").toLowerCase()} on ${entityType} ${targetName || entityId}.`;
        }

        return await logActivity({
            userId,
            storeId,
            action,
            entityId,
            entityType,
            details,
        });
    },
};
