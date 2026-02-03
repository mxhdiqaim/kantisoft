import * as yup from "yup";
import type {LocalSyncStatus} from "@/types/index.ts";

export const createCategorySchema = yup.object({
    name: yup.string().required("Name is required"),
    description: yup.string().optional(),
});

export type CreateCategoryType = yup.InferType<typeof createCategorySchema>;

export type CategoryType = {
    id: string;
    name: string;
    description?: string;
    storeId: string;
    createdAt: string;
    lastModified: string;
}

export type LocalCategoryType = Omit<CategoryType, "createdAt" | "lastModified"> & {
    syncStatus: LocalSyncStatus;
}