/* eslint-disable @typescript-eslint/no-explicit-any */
import * as yup from "yup";

// Type inference from the base schema
export type BaseSchema = {
    id: string;
    createdAt: string;
    lastModified: string;
}

export const extendBaseSchema = <T extends yup.AnyObject>(fields: T): yup.ObjectSchema<any> => {
    return yup.object({
        id: yup.string().uuid().required(),
        createdAt: yup.string().required(),
        lastModified: yup.string().required(),
        ...fields,
    });
};

export const searchSchema = yup.object({
    search: yup.string().min(2).optional(),
});

export type SearchTermType = yup.InferType<typeof searchSchema>;

export const ORDER_PERIODS = ["today", "week", "month", "all-time"] as const;

export const filterSchema = yup.object({
    timePeriod: yup
        .string()
        .oneOf(ORDER_PERIODS, "Invalid period. Must be 'day', 'week', or 'month'.")
        .default("today")
        .required("Period is required."),
});

export type FilterSchemaType = yup.InferType<typeof filterSchema>;

export interface ActivityLogEntry {
    id: string;
    action: string;
    entity?: string;
    entityId?: string;
    details: string;
    status?: string;
    createdAt: string;
    storeName: string;
    userName: string;
    userRole: string;
    entityType?: string;
}

export interface ActivityLogResponse {
    data: ActivityLogEntry[];
    totalCount: number;
    limit: number;
    offset: number;
}

export type DrawerAnchor = "left" | "bottom" | "right" | "top";

export const localSyncStatusEnum = {
    SYNCED: "synced",
    PENDING: "pending",
    ERROR: "error",
    SYNCING: "syncing"
} as const;

export const LOCAL_SYNC_STATUS_VALUES = Object.values(localSyncStatusEnum)

export type LocalSyncStatus = (typeof LOCAL_SYNC_STATUS_VALUES)[number];

export type QueryParamType = { page?: number; limit?: number };