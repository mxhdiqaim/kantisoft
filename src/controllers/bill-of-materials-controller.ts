/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from 'express';
import { CustomRequest } from "../types/express";
import { handleError2 } from "../service/error-handling";
import { StatusCodes } from "http-status-codes";
import db from "../db";
import { billOfMaterials } from '../schema/bill-of-materials-schema';
import { rawMaterials } from '../schema/raw-materials-schema';
import { unitOfMeasurement } from '../schema/unit-of-measurement-schema';
import { eq } from 'drizzle-orm';

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