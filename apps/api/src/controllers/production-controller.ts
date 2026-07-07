/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from "express";
import { CustomRequest } from "../types/express";
import { handleError2 } from "../service/error-handling";
import { StatusCodes } from "http-status-codes";
import { RawMaterialProductionService } from "../service/raw-material-production-service";
import db from "../shared/database";
import { and, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import {
    RawMaterialTransactionSourceEnum,
    TransactionTypeEnum,
    UserRoleEnum,
} from "../types/enums";
import { menuItems } from "../schema/menu-items-schema";
import { validateStoreAndExtractDates } from "../shared/utils/validate-store-dates";
import { nanoid } from "nanoid";
import { UnitConversionService } from "../service/unit-conversion-service";
import { RawMaterialInventoryService } from "../service/raw-material-inventory-service";
import { users } from "../schema/users-schema";
import { productions } from "../schema/production-schema";
import { rawMaterialTransactions } from "../schema/raw-materials-schema/raw-material-stock-transaction-schema";
import { rawMaterials } from "../schema/raw-materials-schema";
import { determineFinalStoreId } from "../shared/utils/store-permission-utils";
import { rawMaterialInventory } from "../schema/raw-materials-schema/raw-material-inventory-schema";
import { ActivityLogService } from "../service/activity-service-log";

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

        const logs = await db
            .select({
                id: productions.id,
                batchReference: productions.batchReference,
                itemName: menuItems.name,
                quantityProduced: productions.quantityProduced,
                totalCost: productions.totalIngredientCost,
                revenueValue: productions.potentialRevenue,
                createdAt: productions.createdAt,
                performedBy: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
            })
            .from(productions)
            .innerJoin(menuItems, eq(productions.menuItemId, menuItems.id))
            .leftJoin(users, eq(productions.performedBy, users.id))
            .where(and(...conditions)) // Spread the array of conditions
            .orderBy(desc(productions.createdAt));

        return res.status(StatusCodes.OK).json(logs);
    } catch (error) {
        return handleError2(
            res,
            "Failed to fetch production logs",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @description Generates a summary of production value and efficiency using the Productions table
 * @route GET /api/v1/production/summary
 * @access Admin, Manager
 */
export const getProductionSummary = async (
    req: CustomRequest,
    res: Response,
) => {
    try {
        const validated = await validateStoreAndExtractDates(req, res);
        if (!validated) return;

        const { storeIds, finalStartDate, finalEndDate } = validated;

        const conditions = [inArray(productions.storeId, storeIds)];
        if (finalStartDate)
            conditions.push(gte(productions.createdAt, finalStartDate));
        if (finalEndDate)
            conditions.push(lte(productions.createdAt, finalEndDate));

        // One clean query to get all aggregates
        const stats = await db
            .select({
                totalCost: sql<number>`SUM(${productions.totalIngredientCost})`,
                totalValue: sql<number>`SUM(${productions.potentialRevenue})`,
                totalItems: sql<number>`SUM(${productions.quantityProduced})`,
                batchCount: sql<number>`COUNT(${productions.id})`,
            })
            .from(productions)
            .where(and(...conditions));

        const totalCost = Number(stats[0]?.totalCost || 0);
        const totalValue = Number(stats[0]?.totalValue || 0);
        const totalItems = Number(stats[0]?.totalItems || 0);

        // Calculate Profit Margin safely
        const profitMargin =
            totalValue > 0 ? ((totalValue - totalCost) / totalValue) * 100 : 0;

        return res.status(StatusCodes.OK).json({
            totalCostOfIngredients: totalCost,
            potentialRevenueCreated: totalValue,
            grossProductionMargin: `${profitMargin.toFixed(2)}%`,
            itemsProducedCount: totalItems,
            numberOfBatches: stats[0]?.batchCount || 0,
        });
    } catch (error) {
        return handleError2(
            res,
            "Could not generate production summary",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @description Executes a production run for a menu item, deducting all required raw materials.
 * @route POST /api/v1/production
 * @access Admin, Manager, Production Staff
 */
export const runProduction = async (req: CustomRequest, res: Response) => {
    try {
        const currentUser = req.user?.data;
        const storeId = currentUser?.storeId;
        const userId = currentUser?.id;

        if (!storeId || !userId) {
            return handleError2(
                res,
                "User does not have an associated store.",
                StatusCodes.BAD_REQUEST,
            );
        }

        const { menuItemId, quantityToProduce } = req.body;

        if (!menuItemId) {
            return handleError2(
                res,
                "Menu Item is required for production.",
                StatusCodes.BAD_REQUEST,
            );
        }

        // Default to 1 if not provided, but validate positive number
        const productionQty =
            quantityToProduce && quantityToProduce > 0 ? quantityToProduce : 1;

        // Generate a unique, human-readable batch ID for auditing
        const productionBatchId = `PROD-${nanoid(10)}`;

        // Execute Production Service
        await RawMaterialProductionService.runProduction(
            menuItemId,
            storeId,
            userId,
            productionBatchId,
            productionQty,
        );

        // Fetch material name for the log (Optional but better for UI)
        const menuItem = await db.query.menuItems.findFirst({
            where: eq(menuItems.id, menuItemId),
        });

        // Activity Logging
        await ActivityLogService.logSystemEvent({
            userId: userId,
            storeId: storeId,
            entityId: productionBatchId,
            entityType: "inventory", // Or "inventory" depending on your preference
            action: "ORDER_STOCK_CREATED", // Mapping to your existing Enums
            actorName: `${currentUser.firstName} ${currentUser.lastName}`,
            targetName: menuItem?.name || "Menu Item",
            details: `Produced ${productionQty} units of ${menuItem?.name}. Batch ID: ${productionBatchId}.`,
            meta: { type: "PRODUCTION", quantity: productionQty },
            isRead: false,
        });

        // Return Success Response
        return res.status(StatusCodes.OK).json({
            message: `Production completed`,
            batchId: productionBatchId,
        });
    } catch (error: any) {
        // 🟢 NEW: Catch our custom "Insufficient Stock" or "Inventory Error" messages
        if (
            error.message.includes("Insufficient Stock") ||
            error.message.includes("Inventory Error")
        ) {
            return handleError2(
                res,
                error.message, // This will now say "Insufficient Stock: You need 5000 units of Rice..."
                StatusCodes.BAD_REQUEST,
            );
        }

        // Handle specific inventory-related errors
        if (error.message.includes("not exist")) {
            return handleError2(
                res,
                "Inventory record missing for one or more ingredients.",
                StatusCodes.NOT_FOUND,
                error instanceof Error ? error : undefined,
            );
        }
        if (error.message.includes("No Bill of Materials defined")) {
            return handleError2(
                res,
                error.message,
                StatusCodes.BAD_REQUEST,
                error instanceof Error ? error : undefined,
            );
        }

        // Catch all other errors (e.g. negative stock constraint violation if implemented)
        return handleError2(
            res,
            "Production failed due to a server or inventory constraint error.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @description Records raw material wastage (spoilage, spills, burnt food).
 * @route POST /api/v1/production/wastage
 */
export const recordWastage = async (req: CustomRequest, res: Response) => {
    try {
        const currentUser = req.user?.data;
        const storeId = currentUser?.storeId;
        const userRole = currentUser?.role;
        const userId = currentUser?.id;

        if (!storeId) {
            return handleError2(
                res,
                "Authentication or Store association missing.",
                StatusCodes.BAD_REQUEST,
            );
        }

        if (!userId) {
            return handleError2(res, "User not found", StatusCodes.BAD_REQUEST);
        }

        const { targetStoreId } = req.query;

        const finalStoreId = await determineFinalStoreId(
            res,
            userRole as UserRoleEnum,
            storeId,
            targetStoreId as string,
        );
        if (!finalStoreId) return; // Error already handled

        const {
            rawMaterialId,
            quantityPresentation,
            unitOfMeasurementId,
            reason,
        } = req.body;

        if (!rawMaterialId || !quantityPresentation || !unitOfMeasurementId) {
            return handleError2(
                res,
                "Missing required wastage data.",
                StatusCodes.BAD_REQUEST,
            );
        }

        // Resolve Inventory Record and Fetch Material Name for Logging
        const inventoryRecord = await db.query.rawMaterialInventory.findFirst({
            where: and(
                eq(rawMaterialInventory.storeId, finalStoreId),
                or(
                    eq(rawMaterialInventory.id, rawMaterialId),
                    eq(rawMaterialInventory.rawMaterialId, rawMaterialId),
                ),
            ),
            with: { rawMaterial: true },
        });

        if (!inventoryRecord) {
            return handleError2(
                res,
                "Material not found in this store's inventory.",
                StatusCodes.NOT_FOUND,
            );
        }

        // Always use the actual RawMaterialId for the stock-out service
        const resolvedRawMaterialId = inventoryRecord.rawMaterialId;

        const materialName =
            inventoryRecord.rawMaterial?.name || "Unknown Material";
        const wasteBatchId = `WASTE-${nanoid(8)}`;

        // Executing Transaction
        await db.transaction(async (tx) => {
            // Convert to Base Units
            const unitRecord =
                await UnitConversionService.fetchUnitById(unitOfMeasurementId);
            if (!unitRecord) throw new Error("Invalid unit of measurement.");

            const quantityBase = UnitConversionService.convertToBaseUnit(
                quantityPresentation,
                unitRecord,
            );

            // Deduct using existing production-grade service
            await RawMaterialInventoryService.processRawMaterialStockOut(tx, {
                rawMaterialId: resolvedRawMaterialId,
                storeId: finalStoreId,
                userId,
                type: TransactionTypeEnum.GOING_OUT,
                source: RawMaterialTransactionSourceEnum.WASTAGE,
                quantityBase: quantityBase,
                documentRefId: wasteBatchId,
                notes: reason || "General kitchen wastage",
            });
        });

        // Activity Logging (Audit Trail)
        await ActivityLogService.logSystemEvent({
            userId: userId,
            storeId: finalStoreId,
            entityId: inventoryRecord.id,
            entityType: "rawMaterialInventory",
            action: "RAW_MATERIAL_INVENTORY_UPDATED",
            actorName: `${currentUser.firstName} ${currentUser.lastName}`,
            targetName: materialName,
            details: `Wastage recorded: ${quantityPresentation} ${unitOfMeasurementId} of ${materialName}. Ref: ${wasteBatchId}. Reason: ${reason || "Not specified"}`,
            meta: { type: "WASTAGE", quantity: quantityPresentation },
        });

        return res.status(StatusCodes.OK).json({
            message: "Wastage recorded successfully. Inventory updated.",
            wasteRef: wasteBatchId,
            material: materialName,
        });
    } catch (error: any) {
        // Handle specific business logic errors from the service
        if (error.message.includes("Insufficient Stock")) {
            return handleError2(res, error.message, StatusCodes.BAD_REQUEST);
        }

        return handleError2(
            res,
            "Failed to complete the action",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
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
        const wastageStats = await db
            .select({
                reason: rawMaterialTransactions.notes, // Or use a dedicated column if you add one
                totalLost: sql<number>`SUM(ABS(${rawMaterialTransactions.quantityBase}))`,
                financialLoss: sql<number>`SUM(ABS(${rawMaterialTransactions.quantityBase}) * ${rawMaterials.latestUnitPrice})`,
            })
            .from(rawMaterialTransactions)
            .innerJoin(
                rawMaterials,
                eq(rawMaterialTransactions.rawMaterialId, rawMaterials.id),
            )
            .where(
                and(
                    inArray(rawMaterialTransactions.storeId, storeIds),
                    eq(
                        rawMaterialTransactions.source,
                        RawMaterialTransactionSourceEnum.WASTAGE,
                    ),
                    gte(rawMaterialTransactions.createdAt, finalStartDate!),
                    lte(rawMaterialTransactions.createdAt, finalEndDate!),
                ),
            )
            .groupBy(rawMaterialTransactions.notes);

        return res.status(StatusCodes.OK).json(wastageStats);
    } catch (error) {
        return handleError2(
            res,
            "Could not generate wastage report",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};
