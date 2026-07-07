/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from "express";
import { CustomRequest } from "../../types/express";
import { handleError2 } from "../../service/error-handling";
import { StatusCodes } from "http-status-codes";
import db from "../../shared/database";
import { and, desc, eq, inArray, notInArray } from "drizzle-orm";
import { rawMaterialInventory } from "../../schema/raw-materials-schema/raw-material-inventory-schema";
import { rawMaterials } from "../../schema/raw-materials-schema";
import { unitOfMeasurement } from "../../schema/unit-of-measurement-schema";
import { UnitConversionService } from "../../service/unit-conversion-service";
import { RawMaterialTransactionSource } from "../../schema/raw-materials-schema/raw-material-stock-transaction-schema";
import {
    ActivityEntityTypeEnum,
    RawMaterialInventoryTransactionTypeEnum,
    RawMaterialTransactionSourceEnum,
    UserRoleEnum,
} from "../../types/enums";
import { RawMaterialInventoryService } from "../../service/raw-material-inventory-service";
import { determineFinalStoreId } from "../../utils/store-permission-utils";
import { generateStockReference } from "../../utils/generate-stock-reference";
import { ActivityLogService } from "../../service/activity-service-log";
import { validateStoreAndExtractDates } from "../../utils/validate-store-dates";

/**
 * @description Retrieves all inventory records for a specific Store.
 * @route GET /api/v1/raw-materials/inventory
 * @access Admin, Manager
 */
export const getAllRawMaterialInventory = async (
    req: CustomRequest,
    res: Response,
) => {
    try {
        const validated = await validateStoreAndExtractDates(req, res);
        if (!validated) return;

        const { storeIds } = validated;

        // Fetch using Relational API for clean nested data
        const inventoryRecords = await db.query.rawMaterialInventory.findMany({
            where: inArray(rawMaterialInventory.storeId, storeIds),
            orderBy: [desc(rawMaterialInventory.lastModified)],
            with: {
                rawMaterial: {
                    with: {
                        unitOfMeasurement: true, // Crucial for the conversion factor
                    },
                },
                store: true,
            },
        });

        // Map and Format using UnitConversionService
        const formattedData = inventoryRecords.map((item) => {
            const material = item.rawMaterial;
            const unit = material.unitOfMeasurement;

            // Conversion Logic: Base -> Presentation (e.g., 5000g -> 5kg)
            // Quantity = Base / Factor
            const displayQuantity =
                item.quantity / (unit.conversionFactorToBase || 1);
            const displayMinLevel =
                item.minStockLevel / (unit.conversionFactorToBase || 1);

            // Price Logic: Base Price -> Presentation Price (e.g., $0.05/g -> $50/kg)
            // We use your service's logic here
            const displayPrice =
                UnitConversionService.displayPriceInPresentationUnit(
                    Number(material.latestUnitPrice || 0),
                    unit,
                );

            return {
                id: item.id,

                // Material Info
                rawMaterialId: material.id,
                rawMaterialName: material.name,

                // Presentation Data (What the user understands)
                quantity: displayQuantity,
                minStockLevel: displayMinLevel,
                latestUnitPrice: displayPrice,

                unitOfMeasurement: {
                    id: unit.id,
                    name: unit.name,
                    symbol: unit.symbol,
                    unitOfMeasurementFamily: unit.unitOfMeasurementFamily,
                },

                // Status and Metadata
                status: item.status,
                lastModified: item.lastModified,
                createdAt: item.createdAt,

                // Store Context
                storeId: item.store.id,
                storeName: item.store.name,

                // System/Debug data (Optional, useful for frontend math checks)
                system: {
                    baseQuantity: item.quantity,
                    conversionFactor: unit.conversionFactorToBase,
                },
            };
        });

        res.status(StatusCodes.OK).json(formattedData);
    } catch (error) {
        handleError2(
            res,
            "Problem loading raw material inventory",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @description Retrieves the current stock level for a Raw Material Inventory.
 * @route GET /api/v1/raw-materials/inventory/:id
 * @access Admin, Manager
 */
export const getCurrentRawMaterialInventoryStock = async (
    req: CustomRequest,
    res: Response,
) => {
    try {
        const validated = await validateStoreAndExtractDates(req, res);
        if (!validated) return;

        const { storeIds } = validated;

        const { id: rawMaterialId } = req.params;

        if (!rawMaterialId) {
            return handleError2(
                res,
                "Missing Raw Material.",
                StatusCodes.BAD_REQUEST,
            );
        }

        if (typeof rawMaterialId !== "string") {
            return handleError2(
                res,
                "Invalid raw material.",
                StatusCodes.BAD_REQUEST,
            );
        }

        // Multi-Join Query
        // Join Inventory -> RawMaterial -> UnitOfMeasurement
        const [stockRecord] = await db
            .select({
                // Inventory Fields
                id: rawMaterialInventory.id,
                quantity: rawMaterialInventory.quantity, // Stored in Base Unit (g, ml)
                minStockLevel: rawMaterialInventory.minStockLevel, // Stored in Base Unit
                status: rawMaterialInventory.status,
                rawMaterialId: rawMaterialInventory.rawMaterialId,
                storeId: rawMaterialInventory.storeId,
                createdAt: rawMaterialInventory.createdAt,
                lastModified: rawMaterialInventory.lastModified,

                // Raw Material Fields
                rawMaterialName: rawMaterials.name,
                latestUnitPrice: rawMaterials.latestUnitPrice, // Price per Base Unit

                // Unit Fields (needed for conversion)
                unitOfMeasurement: {
                    id: unitOfMeasurement.id,
                    name: unitOfMeasurement.name,
                    symbol: unitOfMeasurement.symbol,
                    conversionFactorToBase:
                        unitOfMeasurement.conversionFactorToBase,
                },
            })
            .from(rawMaterialInventory)
            .innerJoin(
                rawMaterials,
                eq(rawMaterialInventory.rawMaterialId, rawMaterials.id),
            )
            .innerJoin(
                // Use inner join here because inventory shouldn't exist without a raw material
                unitOfMeasurement,
                eq(rawMaterials.unitOfMeasurementId, unitOfMeasurement.id),
            )
            .where(
                and(
                    inArray(rawMaterialInventory.storeId, storeIds),
                    eq(rawMaterialInventory.rawMaterialId, rawMaterialId),
                ),
            )
            .limit(1)
            .execute();

        if (!stockRecord) {
            return handleError2(
                res,
                `Inventory record for the Raw Material not found in this store.`,
                StatusCodes.NOT_FOUND,
            );
        }

        // Post-Processing and Conversion

        // Calculate Quantity in Presentation Unit (e.g. convert grams to Kilograms)
        // Note: The service's 'convertToBaseUnit' is designed for the opposite direction (Presentation -> Base).
        // We need the inverse: Base -> Presentation.
        // Formula: Quantity_Presentation = Quantity_Base / ConversionFactorToBase

        // const conversionFactor = stockRecord.unitOfMeasurement.conversionFactorToBase;

        // a. Current Quantity Conversion
        // const quantityPresentation = stockRecord.quantity / conversionFactor;

        // b. Min Stock Level Conversion
        // const minStockLevelPresentation = stockRecord.minStockLevel / conversionFactor;

        // c. Price Conversion (for display)
        const latestUnitPricePresentation =
            UnitConversionService.displayPriceInPresentationUnit(
                stockRecord.latestUnitPrice,
                stockRecord.unitOfMeasurement,
            );

        // Format Response
        return res.status(StatusCodes.OK).json({
            id: stockRecord.id,
            quantity: stockRecord.quantity,
            minStockLevel: stockRecord.minStockLevel,
            status: stockRecord.status,
            rawMaterialId: stockRecord.rawMaterialId,
            storeId: stockRecord.storeId,
            createdAt: stockRecord.createdAt,
            lastModified: stockRecord.lastModified,

            rawMaterialName: stockRecord.rawMaterialName,
            latestUnitPrice: latestUnitPricePresentation,

            // // Displayed Stock Data
            // quantityPresentation: quantityPresentation, // The amount the user understands (e.g. 50 kg)
            // minStockLevelPresentation: minStockLevelPresentation,

            unitOfMeasurement: stockRecord.unitOfMeasurement,
        });
    } catch (error: any) {
        return handleError2(
            res,
            "A server error occurred while fetching the raw material stock.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @description Creates the initial inventory record for a Raw Material in a Store,
 * or updates the minStockLevel if the record already exists (UPSERT).
 * @route POST /api/v1/raw-materials/inventory/create
 * @access Admin, Manager
 * @body { rawMaterialId: string, minStockLevel: number, quantity?: number }
 */
export const createRawMaterialInventoryRecord = async (
    req: CustomRequest,
    res: Response,
) => {
    try {
        const currentUser = req.user?.data;
        const storeId = currentUser?.storeId;

        if (!storeId) {
            return handleError2(
                res,
                "User does not have an associated store.",
                StatusCodes.BAD_REQUEST,
            );
        }

        const userRole = currentUser?.role;
        const { targetStoreId } = req.query;

        const finalStoreId = await determineFinalStoreId(
            res,
            userRole as UserRoleEnum,
            storeId,
            targetStoreId as string,
        );
        if (!finalStoreId) return;

        const { minStockLevel, quantity, rawMaterialId, unitOfMeasurementId } =
            req.body;

        if (!rawMaterialId || !unitOfMeasurementId) {
            return handleError2(
                res,
                "Raw Material and Unit are required",
                StatusCodes.BAD_REQUEST,
            );
        }

        if (
            minStockLevel === undefined ||
            typeof minStockLevel !== "number" ||
            minStockLevel < 0
        ) {
            return handleError2(
                res,
                "Minimum Stock Level is required and must be equal to or greater 0",
                StatusCodes.BAD_REQUEST,
            );
        }

        if (typeof quantity !== "number" || quantity < 0) {
            return handleError2(
                res,
                "Quantity must be equal to or greater 0",
                StatusCodes.BAD_REQUEST,
            );
        }

        // Fetch BOTH the Raw Material and the Unit in parallel
        const [materialRecord, unitRecord] = await Promise.all([
            db.query.rawMaterials.findFirst({
                where: eq(rawMaterials.id, rawMaterialId),
                // Ensure your rawMaterials table includes its unit information
                with: { unitOfMeasurement: true },
            }),

            UnitConversionService.fetchUnitById(unitOfMeasurementId),
        ]);

        if (!materialRecord) {
            return handleError2(
                res,
                "Raw Material not found",
                StatusCodes.NOT_FOUND,
            );
        }

        if (!unitRecord) {
            return handleError2(
                res,
                "Invalid Unit of Measurement",
                StatusCodes.NOT_FOUND,
            );
        }

        // CRITICAL: Cross-Family Validation
        // Assuming rawMaterials has a unitOfMeasurementId or a family field
        const materialFamily =
            materialRecord.unitOfMeasurement.unitOfMeasurementFamily;
        const selectedUnitFamily = unitRecord.unitOfMeasurementFamily;

        if (materialFamily !== selectedUnitFamily) {
            return handleError2(
                res,
                `Incompatible Units: This material is tracked by ${materialFamily}, but you selected a ${selectedUnitFamily} unit.`,
                StatusCodes.BAD_REQUEST,
            );
        }

        // Convert user-facing quantity/minLevel to the system's Base Unit
        const quantityBase = UnitConversionService.convertToBaseUnit(
            quantity || 0,
            unitRecord,
        );
        const minStockLevelBase = UnitConversionService.convertToBaseUnit(
            minStockLevel,
            unitRecord,
        );

        const inventoryRecord =
            await RawMaterialInventoryService.setupInitialInventory({
                rawMaterialId,
                storeId: finalStoreId,
                minStockLevel: minStockLevelBase,
                quantity: quantityBase,
                userId: currentUser.id,
            });

        // Log the activity for the audit trail
        await ActivityLogService.logSystemEvent({
            userId: currentUser.id,
            storeId: finalStoreId,
            entityId: inventoryRecord.id,
            entityType: ActivityEntityTypeEnum.RAW_MATERIAL_INVENTORY,
            action: "RAW_MATERIAL_INVENTORY_CREATED",
            actorName: `${currentUser.firstName} ${currentUser.lastName}`,
            targetName: materialRecord.name, // materialRecord was fetched earlier in parallel
            meta: {
                quantity: quantityBase,
                minStockLevel: minStockLevelBase,
                unit: unitRecord.name,
            },
        });

        return res.status(StatusCodes.CREATED).json(inventoryRecord);
    } catch (error: any) {
        // Handle cases where the rawMaterialId or storeId doesn't exist (foreign key constraint)
        if (error.code === "23503") {
            return handleError2(
                res,
                "Invalid Raw Material ID or Store ID.",
                StatusCodes.NOT_FOUND,
                error instanceof Error ? error : undefined,
            );
        }

        return handleError2(
            res,
            "A server error occurred during inventory setup.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @description Updates the minimum stock level for a raw material inventory record.
 * @route PATCH /api/v1/raw-materials/inventory/:id
 * @access Admin, Manager
 * @body { minStockLevel: number }
 */
export const updateRawMaterialInventoryRecord = async (
    req: CustomRequest,
    res: Response,
) => {
    try {
        const currentUser = req.user?.data;
        const storeId = currentUser?.storeId;

        if (!storeId) {
            return handleError2(
                res,
                "User does not have an associated store.",
                StatusCodes.BAD_REQUEST,
            );
        }

        const userRole = currentUser?.role;
        const { targetStoreId } = req.query;

        const { id: inventoryRecordId } = req.params;
        const { minStockLevel } = req.body;

        if (!inventoryRecordId) {
            return handleError2(
                res,
                "Inventory Record is required",
                StatusCodes.BAD_REQUEST,
            );
        }

        if (typeof inventoryRecordId !== "string") {
            return handleError2(
                res,
                "Invalid Inventory Record.",
                StatusCodes.BAD_REQUEST,
            );
        }

        if (
            minStockLevel === undefined ||
            typeof minStockLevel !== "number" ||
            minStockLevel < 0
        ) {
            return handleError2(
                res,
                "Minimum Stock Level is required and must be equal to or greater 0",
                StatusCodes.BAD_REQUEST,
            );
        }

        const finalStoreId = await determineFinalStoreId(
            res,
            userRole as UserRoleEnum,
            storeId,
            targetStoreId as string,
        );
        if (!finalStoreId) return;

        const result = await RawMaterialInventoryService.updateMinStockLevel({
            inventoryRecordId,
            storeId: finalStoreId,
            newMinStockLevel: minStockLevel,
            userId: currentUser.id,
        });

        // System Ops Log (Audit Trail)
        // We do this outside the DB transaction so it doesn't slow down the lock
        await ActivityLogService.logSystemEvent({
            userId: currentUser.id,
            storeId: finalStoreId,
            entityId: inventoryRecordId,
            entityType: ActivityEntityTypeEnum.RAW_MATERIAL_INVENTORY,
            action: "RAW_MATERIAL_INVENTORY_MINIMUM_STOCK_LEVEL_UPDATED",
            actorName: `${currentUser.firstName} ${currentUser.lastName}`,
            targetName: result.updated.rawMaterialId, // Or fetch the material name
            meta: {
                oldLimit: result.previous.minStockLevel,
                newLimit: minStockLevel,
            },
        });

        return res.status(StatusCodes.OK).json(result.updated);
    } catch (error: any) {
        if (error.message === "NOT_FOUND") {
            return handleError2(
                res,
                "Inventory record not found.",
                StatusCodes.NOT_FOUND,
            );
        }
        return handleError2(
            res,
            "A server error occurred while updating the inventory record.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @description Records an incoming stock transaction (IN) and updates the inventory quantity.
 * @route POST /api/v1/raw-materials/inventory/:id/stock-in
 * @access Admin, Manager
 * @body { unitOfMeasurementId: string, source: RawMaterialTransactionSource, quantity: number, documentRefId: string, notes?: string }
 */
export const stockInRawMaterialInventory = async (
    req: CustomRequest,
    res: Response,
) => {
    try {
        const currentUser = req.user?.data;
        const storeId = currentUser?.storeId;

        if (!storeId) {
            return handleError2(
                res,
                "Authentication required.",
                StatusCodes.UNAUTHORIZED,
            );
        }

        const { id: rawMaterialId } = req.params;
        const { unitOfMeasurementId, source, quantity, documentRefId, notes } =
            req.body;

        // Validation Logic
        if (!rawMaterialId)
            return handleError2(
                res,
                "Missing Raw Material",
                StatusCodes.BAD_REQUEST,
            );
        if (!unitOfMeasurementId)
            return handleError2(
                res,
                "Unit is required",
                StatusCodes.BAD_REQUEST,
            );
        if (!source)
            return handleError2(
                res,
                "Source is required",
                StatusCodes.BAD_REQUEST,
            );
        if (!quantity || quantity <= 0)
            return handleError2(
                res,
                "Quantity must be > 0",
                StatusCodes.BAD_REQUEST,
            );

        if (typeof rawMaterialId !== "string") {
            return handleError2(
                res,
                "Invalid raw material.",
                StatusCodes.BAD_REQUEST,
            );
        }

        const finalStoreId = await determineFinalStoreId(
            res,
            currentUser.role as UserRoleEnum,
            storeId,
            req.query.targetStoreId as string,
        );
        if (!finalStoreId) return;

        // Reference Logic
        let finalReference = documentRefId;
        if (
            source === RawMaterialTransactionSourceEnum.PURCHASE_RECEIPT &&
            !finalReference
        ) {
            return handleError2(
                res,
                "Reference mandatory for purchase receipts.",
                StatusCodes.BAD_REQUEST,
            );
        }

        if (!finalReference) finalReference = generateStockReference();

        // Execute via Service
        // We use processRawMaterialStockAdjustment because it handles unit conversion and master update
        const updatedInventory =
            await RawMaterialInventoryService.processRawMaterialStockAdjustment(
                {
                    rawMaterialId,
                    storeId: finalStoreId,
                    userId: currentUser.id,
                    type: RawMaterialInventoryTransactionTypeEnum.COMING_IN,
                    source: source as RawMaterialTransactionSource,
                    documentRefId: finalReference,
                    notes: notes || `Stock added via ${source}.`,
                },
                quantity,
                unitOfMeasurementId,
            );

        // Activity Log (Audit Trail)
        await ActivityLogService.logSystemEvent({
            userId: currentUser.id,
            storeId: finalStoreId,
            entityId: updatedInventory.id,
            entityType: ActivityEntityTypeEnum.RAW_MATERIAL_INVENTORY,
            action: "RAW_MATERIAL_INVENTORY_UPDATED", // Or a specific STOCK_IN action if defined
            actorName: `${currentUser.firstName} ${currentUser.lastName}`,
            targetName: rawMaterialId,
            meta: {
                type: "STOCK_IN",
                added: quantity,
                ref: finalReference,
                source: source,
            },
        });

        // Response formatting
        const unitRecord =
            await UnitConversionService.fetchUnitById(unitOfMeasurementId);
        const conversionFactor = unitRecord?.conversionFactorToBase || 1;

        return res.status(StatusCodes.OK).json({
            ...updatedInventory,
            currentQuantityPresentation:
                updatedInventory.quantity / conversionFactor,
        });
    } catch (error: any) {
        // Handle custom errors thrown by the service
        if (
            error.message.includes("not found") ||
            error.message.includes("does not exist")
        ) {
            return handleError2(
                res,
                error.message,
                StatusCodes.NOT_FOUND,
                error,
            );
        }

        return handleError2(
            res,
            "A server error occurred while processing the stock addition.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @description Gets raw materials that are NOT yet in the store's inventory
 * Useful for the "Add new item to shelf" UI
 * @route GET /api/v1/raw-materials/inventory/unstocked
 * @access Admin, Manager
 */
export const getUnstockedMaterials = async (
    req: CustomRequest,
    res: Response,
) => {
    try {
        const validated = await validateStoreAndExtractDates(req, res);
        if (!validated) return;

        const { storeIds } = validated;

        // Subquery: Get all IDs already in inventory for this store
        const stockedIds = db
            .select({ id: rawMaterialInventory.rawMaterialId })
            .from(rawMaterialInventory)
            .where(inArray(rawMaterialInventory.storeId, storeIds));

        // Main Query: Get materials NOT in that list
        const availableToStock = await db
            .select()
            .from(rawMaterials)
            .where(notInArray(rawMaterials.id, stockedIds));

        return res.status(StatusCodes.OK).json(availableToStock);
    } catch (error) {
        return handleError2(
            res,
            "A server error occurred while getting the unstocked materials.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};
