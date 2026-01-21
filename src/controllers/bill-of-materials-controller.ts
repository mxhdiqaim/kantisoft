/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from "express";
import { CustomRequest } from "../types/express";
import { handleError2 } from "../service/error-handling";
import { StatusCodes } from "http-status-codes";
import db from "../db";
import { billOfMaterials, InsertBillOfMaterialsSchemaT } from "../schema/bill-of-materials-schema";
import { rawMaterials } from "../schema/raw-materials-schema";
import { unitOfMeasurement } from "../schema/unit-of-measurement-schema";
import { eq } from "drizzle-orm";
import { UnitConversionService } from "../service/unit-conversion-service";

// Define the expected structure of a single item in the request body
interface BomItemRequest {
    rawMaterialId: string;
    consumptionQuantityPresentation: number;
    unitOfMeasurementId: string;
}

/**
 * @description Retrieves the full Bill of Materials (Recipe) for a menu item.
 * Converts the consumption quantity from Base Unit back to Presentation Unit for display.
 * @route GET /api/v1/bill-of-materials/:id/bom
 * @access Admin, Manager, Staff
 */
export const getBillOfMaterials = async (req: CustomRequest, res: Response) => {
    const currentUser = req.user?.data;
    const storeId = currentUser?.storeId;

    if (!storeId) {
        return handleError2(
            res,
            'User does not have an associated store.',
            StatusCodes.BAD_REQUEST
        )
    }

    const { id: menuItemId } = req.params;

    if (!menuItemId) {
        return handleError2(
            res,
            'Something went wrong.',
            StatusCodes.BAD_REQUEST
        );
    }

    try {
        // Multi-Join Query
        // Join BOM -> RawMaterials -> UnitOfMeasurement (the raw material's default presentation unit)
        // We need the unit's conversion factor to calculate the display quantity.
        const results = await db.select({
            // BOM Fields
            bomId: billOfMaterials.id,
            consumptionQuantityBase: billOfMaterials.consumptionQuantityBase,

            // Raw Material Fields
            rawMaterialId: rawMaterials.id,
            rawMaterialName: rawMaterials.name,
            latestUnitPriceBase: rawMaterials.latestUnitPrice, // Price per Base Unit

            // Unit Fields (the raw material's standard presentation unit)
            unitOfMeasurement: {
                id: unitOfMeasurement.id,
                name: unitOfMeasurement.name,
                symbol: unitOfMeasurement.symbol,
                conversionFactorToBase: unitOfMeasurement.conversionFactorToBase,
            }
        })
            .from(billOfMaterials)
            .innerJoin(
                rawMaterials,
                eq(billOfMaterials.rawMaterialId, rawMaterials.id)
            )
            // Join to get the default unit linked to the raw material master record
            .innerJoin(
                unitOfMeasurement,
                eq(rawMaterials.unitOfMeasurementId, unitOfMeasurement.id)
            )
            .where(eq(billOfMaterials.menuItemId, menuItemId))
            .execute();

        if (results.length === 0) {
            return res.status(StatusCodes.OK).json({ message: "No Bill of Materials defined for this menu item." });
        }

        // Post-Processing and Conversion
        const recipe = results.map(item => {

            // CRITICAL: Convert the stored Base Consumption Quantity back to Presentation Quantity for display
            // Formula: Qty_Presentation = Qty_Base / ConversionFactorToBase
            const conversionFactor = item.unitOfMeasurement.conversionFactorToBase;

            const consumptionQuantityPresentation = item.consumptionQuantityBase / conversionFactor;

            // Calculate the current cost for this single ingredient
            // Cost = Qty_Base * Price_Base
            const ingredientCost = item.consumptionQuantityBase * item.latestUnitPriceBase;

            return {
                bomId: item.bomId,
                rawMaterialId: item.rawMaterialId,
                rawMaterialName: item.rawMaterialName,

                // Display Fields
                consumptionQuantity: consumptionQuantityPresentation,
                unitOfMeasurement: item.unitOfMeasurement,

                // Costing Fields
                ingredientCost: ingredientCost,

                // Internal Field (Optional for API, but good for context)
                consumptionQuantityBase: item.consumptionQuantityBase,
            };
        });

        // Return Success Response
        return res.status(StatusCodes.OK).json(recipe);

    } catch (error: any) {
        return handleError2(
            res,
            'A server error occurred while fetching the Bill of Materials.',
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined
        );
    }
};

/**
 * @description Creates or updates the Bill of Materials (BOM) for a menu item.
 * This implementation uses an "overwrite" strategy: all old ingredients are deleted,
 * and the new list is inserted as the current recipe.
 * @route POST /api/v1/menu-items/:id/bom
 * @access Admin, Manager
 */
export const defineBillOfMaterials = async (req: CustomRequest, res: Response) => {
    try {
        const currentUser = req.user?.data;
        const storeId = currentUser?.storeId;

        if (!storeId) {
            return handleError2(
                res,
                'User does not have an associated store.',
                StatusCodes.BAD_REQUEST
            )
        }

        const { id: menuItemId } = req.params;
        const bomItems: BomItemRequest[] = req.body; // Expecting an array of raw material inputs

        console.log("Received BOM Items:", bomItems);

        if (!menuItemId) {
            return handleError2(res, 'Something went wrong', StatusCodes.BAD_REQUEST);
        }

        if (!Array.isArray(bomItems) || bomItems.length === 0) {
            // If the user submits an empty array, we interpret it as clearing the recipe.
            // We will proceed to step 5.a (deletion).
        }
        // We use a transaction to ensure atomicity: either all items are saved, or none are.
        const insertedBOMs = await db.transaction(async (tx) => {

            const recordsToInsert: InsertBillOfMaterialsSchemaT[] = [];

            // Process and Validate Each BOM Item
            for (const item of bomItems) {
                const { rawMaterialId, consumptionQuantityPresentation, unitOfMeasurementId } = item;

                if (!rawMaterialId || consumptionQuantityPresentation === undefined || !unitOfMeasurementId || consumptionQuantityPresentation <= 0) {
                    throw new Error("Invalid BOM item data: material ID, positive quantity, and unit ID are required.");
                }

                // Fetch the Unit Record (the unit the user specified, e.g., 'cup')
                const unitOfMeasurementRecord = await UnitConversionService.fetchUnitById(unitOfMeasurementId);

                if (!unitOfMeasurementRecord) {
                    throw new Error(`Unit of Measurement not found.`);
                }

                // 3. CRITICAL: Convert Consumption Quantity to the Raw Material's BASE Unit
                // (e.g. 2 cups * 240 g/cup = 480 g)
                const consumptionQuantityBase = UnitConversionService.convertToBaseUnit(
                    consumptionQuantityPresentation,
                    unitOfMeasurementRecord
                );

                // Check if the Raw Material itself is valid (FK check)
                const rawMaterialCheck = await tx.query.rawMaterials.findFirst({
                    where: eq(rawMaterials.id, rawMaterialId)
                });

                if (!rawMaterialCheck) {
                    throw new Error(`Raw Material not found.`);
                }

                recordsToInsert.push({
                    menuItemId: menuItemId,
                    rawMaterialId: rawMaterialId,
                    consumptionQuantityBase: consumptionQuantityBase,
                    storeId,
                });
            }

            // Database Operations: Overwrite

            // Delete existing BOM items for this menuItemId (Overwrite/Reset)
            await tx.delete(billOfMaterials)
                .where(eq(billOfMaterials.menuItemId, menuItemId));

            // Insert the new BOM items (only if the list is not empty)
            if (recordsToInsert.length > 0) {
                return await tx
                    .insert(billOfMaterials)
                    .values(recordsToInsert)
                    .returning();
            }

            return []; // Return an empty array if the recipe was just cleared
        });

        return res.status(StatusCodes.CREATED).json(insertedBOMs);

    } catch (error: any) {
        if (error.message.includes("not found") || error.message.includes("Invalid")) {
            return handleError2(res, error.message, StatusCodes.BAD_REQUEST, error);
        }

        return handleError2(
            res,
            'A server error occurred while defining the Bill of Materials.',
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined
        );
    }
};