/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from 'express';
import { CustomRequest } from "../types/express";
import { handleError2 } from "../service/error-handling";
import { StatusCodes } from "http-status-codes";
import {RawMaterialProductionService} from "../service/raw-material-production-service";
import db from "../db";
import { rawMaterialTransactions } from "../schema/raw-materials-schema/raw-material-stock-transaction-schema";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { rawMaterials } from "../schema/raw-materials-schema";
import { RawMaterialTransactionSourceEnum } from "../types/enums";
import { inventoryTransactions } from "../schema/inventory-schema/inventory-transaction-schema";
import { menuItems } from "../schema/menu-items-schema";
import { validateStoreAndExtractDates } from "../utils/validate-store-dates";
import { nanoid } from "nanoid"; // For generating a production batch ID


/**
 * @description Generates a summary of production value and efficiency for a given period.
 * @route GET /api/v1/production/summary
 * @access Admin, Manager
 */
export const getProductionSummary = async (req: CustomRequest, res: Response) => {
    try {
        const validated = await validateStoreAndExtractDates(req, res);
        if (!validated) return; // Error already handled

        const { storeIds, finalStartDate, finalEndDate } = validated;

        // Calculate Total Cost of Raw Materials Consumed
        const rawConsumption = await db.select({
            totalCost: sql<number>`SUM(${rawMaterialTransactions.quantityBase} * ${rawMaterials.latestUnitPrice})`
        })
            .from(rawMaterialTransactions)
            .innerJoin(rawMaterials, eq(rawMaterialTransactions.rawMaterialId, rawMaterials.id))
            .where(
                and(
                    inArray(rawMaterialTransactions.storeId, storeIds),
                    eq(rawMaterialTransactions.source, RawMaterialTransactionSourceEnum.PRODUCTION_CONSUMPTION),
                    gte(rawMaterialTransactions.createdAt, finalStartDate!),
                    lte(rawMaterialTransactions.createdAt, finalEndDate!)
                )
            );

        // Calculate Total Value of Menu Items Produced
        const productionOutput = await db.select({
            count: sql<number>`SUM(${inventoryTransactions.quantityChange})`,
            totalValue: sql<number>`SUM(${inventoryTransactions.quantityChange} * ${menuItems.price})`
        })
            .from(inventoryTransactions)
            .innerJoin(menuItems, eq(inventoryTransactions.menuItemId, menuItems.id))
            .where(
                and(
                    inArray(inventoryTransactions.storeId, storeIds),
                    eq(inventoryTransactions.transactionType, 'productionIn'),
                    gte(inventoryTransactions.createdAt, finalStartDate!),
                    lte(inventoryTransactions.createdAt, finalEndDate!)
                )
            );

        const totalCost = Number(rawConsumption[0]?.totalCost || 0);
        const totalValue = Number(productionOutput[0]?.totalValue || 0);
        const profitMargin = totalValue > 0 ? ((totalValue - totalCost) / totalValue) * 100 : 0;

        return res.status(StatusCodes.OK).json({
            totalCostOfIngredients: totalCost,
            potentialRevenueCreated: totalValue,
            grossProductionMargin: `${profitMargin.toFixed(2)}%`,
            itemsProducedCount: productionOutput[0]?.count || 0
        });

    } catch (error) {
        return handleError2(res, 'Could not generate production report', StatusCodes.INTERNAL_SERVER_ERROR, error instanceof Error ? error : undefined);
    }
};

/**
 * @description Executes a production run for a menu item, deducting all required raw materials.
 * @route POST /api/v1/production
 * @access Admin, Manager, Production Staff
 */
export const runProduction = async (req: CustomRequest, res: Response) => {
    const currentUser = req.user?.data;
    const storeId = currentUser?.storeId;
    const userId = currentUser?.id;

    if (!storeId || !userId) {
        return handleError2(
            res,
            'User/Store context missing.',
            StatusCodes.BAD_REQUEST
        );
    }

    const { menuItemId, quantityToProduce } = req.body;

    if (!menuItemId) {
        return handleError2(res, 'Menu Item is required for production.', StatusCodes.BAD_REQUEST);
    }

    // Default to 1 if not provided, but validate positive number
    const productionQty = quantityToProduce && quantityToProduce > 0 ? quantityToProduce : 1;

    // Generate a unique, human-readable batch ID for auditing
    const productionBatchId = `PROD-${nanoid(10)}`;

    try {
        // Execute Production Service
        await RawMaterialProductionService.runProduction(
            menuItemId,
            storeId,
            userId,
            productionBatchId,
            productionQty
        );

        // Return Success Response
        return res.status(StatusCodes.OK).json({
            message: `Production of ${productionQty} units completed successfully.`,
            menuItemId: menuItemId,
            productionBatchId: productionBatchId,
            storeId: storeId,
        });

    } catch (error: any) {
        // Handle specific inventory-related errors
        if (error.message.includes('not exist')) {
            return handleError2(
                res,
                'Inventory record missing for one or more ingredients.',
                StatusCodes.NOT_FOUND,
                error instanceof Error ? error : undefined
            );
        }
        if (error.message.includes('No Bill of Materials defined')) {
            return handleError2(
                res,
                error.message,
                StatusCodes.BAD_REQUEST,
                error instanceof Error ? error : undefined
            );
        }

        // Catch all other errors (e.g. negative stock constraint violation if implemented)
        return handleError2(
            res,
            'Production failed due to a server or inventory constraint error.',
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined
        );
    }
};