import * as yup from "yup";
import { extendBaseSchema } from "@/shared/types";

export const STORE_TYPES: readonly string[] = ["restaurant", "pharmacy", "supermarket"] as const;

// Base schema for a store, matching the backend
export const baseBusinessSchema = yup.object({
    businessName: yup.string().required("Business name is required."),
    countryId: yup.string().uuid().required("Country is required."),
    description: yup.string().optional(),
    logoUrl: yup.string().optional(),
    addressId: yup.string().uuid().required("Address is required."),
    companyRegistrationNumber: yup.string().optional(),
    teamSize: yup.string().optional(),
    taxOrVatId: yup.string().optional(),
});

export const createBusinessSchema = baseBusinessSchema;

export const businessSchema = extendBaseSchema(baseBusinessSchema);

export type BusinessType = yup.InferType<typeof businessSchema>;
export type CreateBusinessType = yup.InferType<typeof createBusinessSchema>;

export type Pagination = {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
};

export type PaginatedStoreResponse = {
    data: BusinessType[];
    pagination: Pagination;
};
