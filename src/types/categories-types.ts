import * as yup from "yup";

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