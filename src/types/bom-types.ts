import * as yup from "yup";
import type {UnitOfMeasurementType} from "@/types/unit-of-measurement-types.ts";

export type BomTypes = {
    bomId: string;
    rawMaterialId: string;
    rawMaterialName: string;
    consumptionQuantity: number;
    unitOfMeasurement: UnitOfMeasurementType;
    ingredientCost: number;
    consumptionQuantityBase: number;
}

export const defineBomSchema = yup.object({
    menuItemId: yup.string().uuid().required("Menu Item ID is required."),
    bomItems: yup.array().of(
        yup.object({
            rawMaterialId: yup.string().uuid().required("Raw Material ID is required."),
            consumptionQuantityPresentation: yup.number().positive("Consumption quantity must be greater than zero.").required("Consumption quantity is required."),
            unitOfMeasurementId: yup.string().uuid().required("Unit of Measurement ID is required."),
        })
    ).min(1, "At least one BOM item is required."),
});

export type DefineBomSchemaType = yup.InferType<typeof defineBomSchema>;