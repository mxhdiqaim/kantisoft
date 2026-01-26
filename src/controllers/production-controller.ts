/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from 'express';
import { CustomRequest } from "../types/express";
import { handleError2 } from "../service/error-handling";
import { StatusCodes } from "http-status-codes";
import {RawMaterialProductionService} from "../service/raw-material-production-service";
import db from "../db";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { RawMaterialTransactionSourceEnum, TransactionTypeEnum } from "../types/enums";
import { menuItems } from "../schema/menu-items-schema";
import { validateStoreAndExtractDates } from "../utils/validate-store-dates";
import { nanoid } from "nanoid";
import { UnitConversionService } from "../service/unit-conversion-service";
import { InventoryAdjustmentService } from "../service/raw-material-inventory-adjustment-service";
import { users } from "../schema/users-schema";
import { productions } from "../schema/production-schema";
import { inventory } from "../schema/inventory-schema";
import { rawMaterialTransactions } from "../schema/raw-materials-schema/raw-material-stock-transaction-schema";
import { rawMaterials } from "../schema/raw-materials-schema"; // For generating a production batch ID


/**
 * @description Get a detailed list of all production transactions
 * @route GET /api/v1/production/logs
 */
export const getProductionLogs = async (req: CustomRequest, res: Response) => {
    try {
        const validated = await validateStoreAndExtractDates(req, res);
        if (!validated) return;

        const { storeIds, finalStartDate, finalEndDate } = validated;

        // Build the base conditions (Store filtering is mandatory)
        const conditions = [inArray(productions.storeId, storeIds)];

        // Only add date filters if they exist (prevents the toISOString error)
        if (finalStartDate) {
            conditions.push(gte(productions.createdAt, finalStartDate));
        }
        if (finalEndDate) {
            conditions.push(lte(productions.createdAt, finalEndDate));
        }

        const logs = await db.select({
            id: productions.id,
            batchReference: productions.batchReference,
            itemName: menuItems.name,
            quantityProduced: productions.quantityProduced,
            totalCost: productions.totalIngredientCost,
            revenueValue: productions.potentialRevenue,
            createdAt: productions.createdAt,
            performedBy: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`
        })
            .from(productions)
            .innerJoin(menuItems, eq(productions.menuItemId, menuItems.id))
            .leftJoin(users, eq(productions.performedBy, users.id))
            .where(and(...conditions)) // Spread the array of conditions
            .orderBy(desc(productions.createdAt));

        return res.status(StatusCodes.OK).json(logs);
    } catch (error) {
        return handleError2(res, 'Failed to fetch production logs', StatusCodes.INTERNAL_SERVER_ERROR, error instanceof Error ? error : undefined);
    }
};

/**
 * @description Generates a summary of production value and efficiency using the Productions table
 * @route GET /api/v1/production/summary
 * @access Admin, Manager
 */
export const getProductionSummary = async (req: CustomRequest, res: Response) => {
    try {
        const validated = await validateStoreAndExtractDates(req, res);
        if (!validated) return;

        const { storeIds, finalStartDate, finalEndDate } = validated;

        const conditions = [inArray(productions.storeId, storeIds)];
        if (finalStartDate) conditions.push(gte(productions.createdAt, finalStartDate));
        if (finalEndDate) conditions.push(lte(productions.createdAt, finalEndDate));

        // One clean query to get all aggregates
        const stats = await db.select({
            totalCost: sql<number>`SUM(${productions.totalIngredientCost})`,
            totalValue: sql<number>`SUM(${productions.potentialRevenue})`,
            totalItems: sql<number>`SUM(${productions.quantityProduced})`,
            batchCount: sql<number>`COUNT(${productions.id})`
        })
            .from(productions)
            .where(and(...conditions));

        const totalCost = Number(stats[0]?.totalCost || 0);
        const totalValue = Number(stats[0]?.totalValue || 0);
        const totalItems = Number(stats[0]?.totalItems || 0);

        // Calculate Profit Margin safely
        const profitMargin = totalValue > 0
            ? ((totalValue - totalCost) / totalValue) * 100
            : 0;

        return res.status(StatusCodes.OK).json({
            summary: {
                totalCostOfIngredients: totalCost,
                potentialRevenueCreated: totalValue,
                grossProductionMargin: `${profitMargin.toFixed(2)}%`,
                itemsProducedCount: totalItems,
                numberOfBatches: stats[0]?.batchCount || 0
            }
        });

    } catch (error) {
        return handleError2(res, 'Could not generate production summary', StatusCodes.INTERNAL_SERVER_ERROR, error instanceof Error ? error : undefined);
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
            'User does not have an associated store.',
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

        // Fetch the updated inventory for the item to return to the UI
        const updatedStock = await db.query.inventory.findFirst({
            where: eq(inventory.menuItemId, menuItemId)
        });

        // Return Success Response
        return res.status(StatusCodes.OK).json({
            message: `Production completed`,
            newQuantity: updatedStock?.quantity || 0,
            batchId: productionBatchId,
        });

    } catch (error: any) {
        // 🟢 NEW: Catch our custom "Insufficient Stock" or "Inventory Error" messages
        if (error.message.includes('Insufficient Stock') || error.message.includes('Inventory Error')) {
            return handleError2(
                res,
                error.message, // This will now say "Insufficient Stock: You need 5000 units of Rice..."
                StatusCodes.BAD_REQUEST
            );
        }

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

/**
 * @description Records raw material wastage (spoilage, spills, burnt food).
 * @route POST /api/v1/production/wastage
 */
export const recordWastage = async (req: CustomRequest, res: Response) => {
    const currentUser = req.user?.data;
    const storeId = currentUser?.storeId;
    const userId = currentUser?.id;

    if (!userId) {
        return handleError2(
            res,
            'User not found',
            StatusCodes.BAD_REQUEST
        );
    }

    if (!storeId) {
        return handleError2(
            res,
            'User does not have an associated store.',
            StatusCodes.BAD_REQUEST
        );
    }

    const { rawMaterialId, quantityPresentation, unitOfMeasurementId, reason } = req.body;

    if (!rawMaterialId || !quantityPresentation || !unitOfMeasurementId) {
        return handleError2(res, 'Missing required wastage data.', StatusCodes.BAD_REQUEST);
    }

    try {
        const wasteBatchId = `WASTE-${nanoid(8)}`;

        await db.transaction(async (tx) => {
            // Convert the wasted amount to Base Units (e.g. 2 kg -> 2000 g)
            const unitRecord = await UnitConversionService.fetchUnitById(unitOfMeasurementId);
            if (!unitRecord) throw new Error("Invalid unit of measurement.");

            const quantityBase = UnitConversionService.convertToBaseUnit(
                quantityPresentation,
                unitRecord
            );

            // Use our existing service to deduct stock
            // We use 'wastage' as the source so it shows up correctly in reports
            await InventoryAdjustmentService.processRawMaterialStockOut(tx, {
                rawMaterialId,
                storeId,
                userId,
                type: TransactionTypeEnum.GOING_OUT,
                source: RawMaterialTransactionSourceEnum.WASTAGE,
                quantityBase: quantityBase,
                documentRefId: wasteBatchId,
                notes: reason || "General kitchen wastage",
            });
        });

        return res.status(StatusCodes.OK).json({
            message: "Wastage recorded successfully. Inventory updated.",
            wasteRef: wasteBatchId
        });

    } catch (error) {
        return handleError2(res, "Failed to complete the action", StatusCodes.INTERNAL_SERVER_ERROR, error instanceof Error ? error : undefined);
    }
};

/**
 * @description Generates a summary of wastage by reason and cost.
 * @route GET /api/v1/production/wastage/summary
 */
export const getWastageSummary = async (req: CustomRequest, res: Response) => {
    try {
        const validated = await validateStoreAndExtractDates(req, res);
        if (!validated) return;

        const { storeIds, finalStartDate, finalEndDate } = validated;

        // Group wastage by reason and calculate total cost impact
        const wastageStats = await db.select({
            reason: rawMaterialTransactions.notes, // Or use a dedicated column if you add one
            totalLost: sql<number>`SUM(ABS(${rawMaterialTransactions.quantityBase}))`,
            financialLoss: sql<number>`SUM(ABS(${rawMaterialTransactions.quantityBase}) * ${rawMaterials.latestUnitPrice})`
        })
            .from(rawMaterialTransactions)
            .innerJoin(rawMaterials, eq(rawMaterialTransactions.rawMaterialId, rawMaterials.id))
            .where(
                and(
                    inArray(rawMaterialTransactions.storeId, storeIds),
                    eq(rawMaterialTransactions.source, RawMaterialTransactionSourceEnum.WASTAGE),
                    gte(rawMaterialTransactions.createdAt, finalStartDate!),
                    lte(rawMaterialTransactions.createdAt, finalEndDate!)
                )
            )
            .groupBy(rawMaterialTransactions.notes);

        return res.status(StatusCodes.OK).json(wastageStats);
    } catch (error) {
        return handleError2(res, 'Could not generate wastage report', StatusCodes.INTERNAL_SERVER_ERROR, error instanceof Error ? error : undefined);
    }
};