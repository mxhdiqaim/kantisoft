import * as yup from "yup";

export type ProductionType = {
    id: string;
    batchReference: string;
    itemName: string;
    quantityProduced: number;
    totalCost: number;
    revenueValue: number;
    createdAt: string;
    performedBy: string;
}

export const createProductionSchema = yup.object({
    menuItemId: yup.string().uuid().required("Menu Item is required."),
    quantityToProduce: yup.number().positive("Quantity to produce must be greater than zero.").required("Quantity to produce is required.").typeError("Quantity to produce must be a valid number."),
});

export type CreateProductionType = yup.InferType<typeof createProductionSchema>;

export const createWastageScheme = yup.object({
    rawMaterialId: yup.string().uuid("Invalid Raw Material").typeError("Raw Material must be selected.").required("Raw Material is required."),
    quantityPresentation: yup.number().positive("Quantity must be greater than zero.").required("Quantity is required.").typeError("Quantity must be a valid number."),
    unitOfMeasurementId: yup.string().uuid("Invalid Measurement Unit").typeError("Measurement unit must be selected.").required("Measurement unit is required."),
    reason: yup.string().max(255, "Reason cannot exceed 255 characters.").optional(),
});

export type CreateWastageType = yup.InferType<typeof createWastageScheme>;

export type ProductionWastageSummaryType = {
    reason: string;
    totalLost: number;
    financialLoss: number;
}

export type FinishedGoodsProfitMarginType = {
    storeQueryType: string;
    name: string;
    sellingPrice: number;
    totalCost: number;
    grossProfit: number;
    marginPercentage: number;
    status: "HEALTHY" | "LOW_MARGIN";
}

export type ProductionSummaryType = {
    grossProductionMargin: string;
    itemsProducedCount: number;
    numberOfBatches: number;
    potentialRevenueCreated: number;
    totalCostOfIngredients: number;
}