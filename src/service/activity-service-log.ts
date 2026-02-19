import { ActivityActionType } from "../schema/activity-log-schema";
import { logActivity } from "./activity-logger";
import { formatActivityDetails } from "../utils";

export interface LogParams {
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
    details?: string;
    isRead?: boolean;
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
        details,
        isRead,
    }: LogParams) {
        const finalDetails =
            details ??
            formatActivityDetails({
                action,
                actorName,
                entityType,
                targetName,
                entityId,
                meta,
            });

        return await logActivity({
            userId,
            storeId,
            action,
            entityId,
            entityType,
            details: finalDetails,
            isRead: isRead ?? false,
        });
    },
};
