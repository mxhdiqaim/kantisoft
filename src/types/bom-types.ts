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
    // menuItemId: yup.string().uuid().required("Menu Item ID is required."),
    bomItems: yup.array().of(
        yup.object({
            rawMaterialId: yup.string().uuid("Invalid Raw Material").typeError("Raw Material must be selected.").required("Raw Material is required."),
            consumptionQuantityPresentation: yup.number().positive("Quantity must be greater than zero.").required("Quantity is required.").typeError("Quantity must be a valid number."),
            unitOfMeasurementId: yup.string().uuid("Invalid Measurement Unit").typeError("Measurement unit must be selected.").required("Measurement unit is required."),
        })
    ).min(1, "At least one BOM item is required."),
});

export type DefineBomSchemaType = yup.InferType<typeof defineBomSchema>;

// { menuItemId: string; quantityToProduce: number }

export const productionRequestSchema = yup.object({
    menuItemId: yup.string().uuid().required("Menu Item is required."),
    quantityToProduce: yup.number().positive("Quantity to produce must be greater than zero.").required("Quantity to produce is required.").typeError("Quantity to produce must be a valid number."),
});

export type ProductionRequestType = yup.InferType<typeof productionRequestSchema>;