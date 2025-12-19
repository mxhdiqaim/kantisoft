/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from 'express';
import { CustomRequest } from "../../types/express";
import { handleError2 } from "../../service/error-handling";
import { StatusCodes } from "http-status-codes";
import db from "../../db";
import { and, desc, eq, sql } from "drizzle-orm";
import {rawMaterialInventory} from "../../schema/raw-materials-schema/raw-material-inventory-schema";
import {rawMaterials} from "../../schema/raw-materials-schema";
import {unitOfMeasurement} from "../../schema/unit-of-measurement-schema";
import {UnitConversionService} from "../../service/unit-conversion-service";
import {
    RawMaterialTransactionSource,
    rawMaterialTransactionSourceEnum
} from "../../schema/raw-materials-schema/raw-material-stock-transaction-schema";
import { RawMaterialTransactionTypeEnum, UserRoleEnum } from "../../types/enums";
import {InventoryAdjustmentService} from "../../service/raw-material-inventory-adjustment-service";
import { determineFinalStoreId } from "../../utils/store-permission-utils";

/**
 * @description Retrieves all inventory records for a specific Store.
 * @route GET /api/v1/raw-materials/inventory
 * @access Admin, Manager, Staff
 */
export const getAllRawMaterialInventory = async (req: CustomRequest, res: Response) => {
    try {
        const currentUser = req.user?.data;
        const storeId = currentUser?.storeId;
        const userRole = currentUser?.role;

        if (!storeId) {
            return handleError2(res, "Store association required.", StatusCodes.FORBIDDEN);
        }

        const { targetStoreId } = req.query;

        const finalStoreId = await determineFinalStoreId(res, userRole as UserRoleEnum, storeId, targetStoreId as string);
        if (!finalStoreId) return;

        // Fetch using Relational API
        const allRawMaterialInventory = await db.query.rawMaterialInventory.findMany({
            where: eq(rawMaterialInventory.storeId, finalStoreId),
            orderBy: [desc(rawMaterialInventory.lastModified)],
            columns: {
                id: true,
                quantity: true,
                minStockLevel: true,
                status: true,
                createdAt: true,
                lastModified: true
            },
            with: {
                rawMaterial: {
                    columns: {
                        id: true,
                        name: true,
                        latestUnitPrice: true
                    },
                    with: {
                        unitOfMeasurement: {
                            columns: {
                                id: true,
                                name: true
                            }
                        }
                    }
                },
                store: {
                    columns: {
                        id: true,
                        name: true
                    }
                },
            },
        });

        // Format data for table display
        const formattedData = allRawMaterialInventory.map(item => ({
            id: item.id,
            quantity: item.quantity,
            minStockLevel: item.minStockLevel,
            status: item.status,
            createdAt: item.createdAt,
            lastModified: item.lastModified,

            rawMaterialId: item.rawMaterial.id,
            rawMaterialName: item.rawMaterial.name,
            latestUnitPrice: item.rawMaterial.latestUnitPrice,

            unitOfMeasurementId: item.rawMaterial.unitOfMeasurement.id,
            unitOfMeasurementName: item.rawMaterial.unitOfMeasurement.name,

            storeId: item.store.id,
            storeName: item.store.name,
        }));

        res.status(StatusCodes.OK).json(formattedData);

    } catch (error) {

        handleError2(
            res,
            "Problem loading raw material inventory",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined
        );
    }
};

/**
 * @description Retrieves the current stock level for a Raw Material in a specific Store.
 * @route GET /api/v1/raw-materials/inventory/:id
 * @access Admin, Manager, Staff
 */
export const getCurrentRawMaterialStock = async (req: CustomRequest, res: Response) => {
    const currentUser = req.user?.data;
    const storeId = currentUser?.storeId;

    if (!storeId) {
        return handleError2(
            res,
            'User does not have an associated store.',
            StatusCodes.BAD_REQUEST
        );
    }
    const userRole = currentUser?.role;
    const { targetStoreId } = req.query;

    const finalStoreId = await determineFinalStoreId(res, userRole as UserRoleEnum, storeId, targetStoreId as string);
    if (!finalStoreId) return;  // Error already handled

    const { id: rawMaterialId } = req.params;

    if (!rawMaterialId) {
        return handleError2(res, 'Missing Raw Material.', StatusCodes.BAD_REQUEST);
    }

    try {
        // Multi-Join Query
        // Join Inventory -> RawMaterial -> UnitOfMeasurement
        const [stockRecord] = await db.select({
            // Inventory Fields
            inventoryId: rawMaterialInventory.id,
            rawMaterialId: rawMaterialInventory.rawMaterialId,
            storeId: rawMaterialInventory.storeId,
            quantityBase: rawMaterialInventory.quantity, // Stored in Base Unit (g, ml)
            minStockLevelBase: rawMaterialInventory.minStockLevel, // Stored in Base Unit
            status: rawMaterialInventory.status,

            // Raw Material Fields
            rawMaterialName: rawMaterials.name,
            latestUnitPriceBase: rawMaterials.latestUnitPrice, // Price per Base Unit

            // Unit Fields (needed for conversion)
            unitOfMeasurement: {
                id: unitOfMeasurement.id,
                name: unitOfMeasurement.name,
                symbol: unitOfMeasurement.symbol,
                conversionFactorToBase: unitOfMeasurement.conversionFactorToBase,
            }
        })
            .from(rawMaterialInventory)
            .innerJoin(
                rawMaterials,
                eq(rawMaterialInventory.rawMaterialId, rawMaterials.id)
            )
            .innerJoin( // Use inner join here because inventory shouldn't exist without a raw material
                unitOfMeasurement,
                eq(rawMaterials.unitOfMeasurementId, unitOfMeasurement.id)
            )
            .where(and(
                eq(rawMaterialInventory.storeId, finalStoreId),
                eq(rawMaterialInventory.rawMaterialId, rawMaterialId),
            ))
            .limit(1)
            .execute();

        if (!stockRecord) {
            return handleError2(
                res,
                `Inventory record for the Raw Material not found in this store.`,
                StatusCodes.NOT_FOUND
            );
        }

        // Post-Processing and Conversion

        // Calculate Quantity in Presentation Unit (e.g. convert grams to Kilograms)
        // Note: The service's 'convertToBaseUnit' is designed for the opposite direction (Presentation -> Base).
        // We need the inverse: Base -> Presentation.
        // Formula: Quantity_Presentation = Quantity_Base / ConversionFactorToBase

        const conversionFactor = stockRecord.unitOfMeasurement.conversionFactorToBase;

        // a. Current Quantity Conversion
        const quantityPresentation = stockRecord.quantityBase / conversionFactor;

        // b. Min Stock Level Conversion
        const minStockLevelPresentation = stockRecord.minStockLevelBase / conversionFactor;

        // c. Price Conversion (for display)
        const latestUnitPricePresentation = UnitConversionService.displayPriceInPresentationUnit(
            stockRecord.latestUnitPriceBase,
            stockRecord.unitOfMeasurement
        );

        // Format Response
        return res.status(StatusCodes.OK).json({
            inventoryId: stockRecord.inventoryId,
            rawMaterialId: stockRecord.rawMaterialId,
            rawMaterialName: stockRecord.rawMaterialName,

            // Displayed Stock Data
            quantityPresentation: quantityPresentation, // The amount the user understands (e.g. 50 kg)
            minStockLevelPresentation: minStockLevelPresentation,
            unitOfMeasurement: stockRecord.unitOfMeasurement,
            status: stockRecord.status,

            // Price Data
            latestUnitPricePresentation: latestUnitPricePresentation,

            // Internal Data (Optional for API, but good for context)
            quantityBase: stockRecord.quantityBase,
            minStockLevelBase: stockRecord.minStockLevelBase,
        });

    } catch (error: any) {
        return handleError2(
            res,
            'A server error occurred while fetching the raw material stock.',
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined
        );
    }
};

/**
 * @description Creates the initial inventory record for a Raw Material in a Store,
 * or updates the minStockLevel if the record already exists (UPSERT).
 * @route POST /api/v1/raw-materials/inventory/:id
 * @access Admin, Manager
 * @body { rawMaterialId: string, minStockLevel: number, quantity?: number }
 */
export const createRawMaterialInventoryRecord = async (req: CustomRequest, res: Response) => {
    const currentUser = req.user?.data;
    const storeId = currentUser?.storeId;

    if (!storeId) {
        return handleError2(
            res,
            'User does not have an associated store.',
            StatusCodes.BAD_REQUEST
        );
    }

    const userRole = currentUser?.role;
    const { targetStoreId } = req.query;

    const finalStoreId = await determineFinalStoreId(res, userRole as UserRoleEnum, storeId, targetStoreId as string);
    if (!finalStoreId) return;

    const { id: rawMaterialId } = req.params;
    const { minStockLevel, quantity } = req.body;

    // We assume minStockLevel is mandatory for setting up inventory tracking
    if (!rawMaterialId || minStockLevel === undefined || typeof minStockLevel !== 'number' || minStockLevel < 0 || typeof quantity !== "number" || quantity < 0) {
        return handleError2(res, 'Raw Material and minStockLevel and it must be equal to or greater 0', StatusCodes.BAD_REQUEST);
    }


    try {
        // Data to insert or update
        const inventoryData = {
            rawMaterialId: rawMaterialId,
            storeId: finalStoreId,
            minStockLevel: minStockLevel,
            quantity: quantity, // if not provided, it  defaults to 0
            // status defaults to 'inStock'
        };

        const [inventoryRecord] = await db.insert(rawMaterialInventory)
            .values(inventoryData)
            .onConflictDoUpdate({
                // Target the unique index combining rawMaterialId and storeId
                target: [rawMaterialInventory.rawMaterialId, rawMaterialInventory.storeId],

                // If conflicted, only update the minStockLevel
                set: {
                    minStockLevel: sql`excluded."minStockLevel"`,
                },

                setWhere: eq(rawMaterialInventory.storeId, finalStoreId),
            })
            .returning();

        // Determine Action and Return Success
        // (We can't easily tell if it was an insert or update from Drizzle's result array,
        // so we use a generic success message focusing on the outcome)

        return res.status(StatusCodes.CREATED).json(inventoryRecord);

    } catch (error: any) {
        // Handle cases where the rawMaterialId or storeId doesn't exist (foreign key constraint)
        if (error.code === '23503') {
            return handleError2(
                res,
                'Invalid Raw Material ID or Store ID.',
                StatusCodes.NOT_FOUND,
                error instanceof Error ? error : undefined
            );
        }

        return handleError2(
            res,
            'A server error occurred during inventory setup.',
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined
        );
    }
};


/**
 * @description Records an incoming stock transaction (IN) and updates the inventory quantity.
 * @route POST /api/v1/raw-material-inventory/:id/stock-in
 * @access Admin, Manager, Stock Clerk
 */
export const addStockToRawMaterial = async (req: CustomRequest, res: Response) => {
    const currentUser = req.user?.data;
    const storeId = currentUser?.storeId;
    const userId = currentUser?.id;
    const { id: rawMaterialId } = req.params;

    if (!storeId || !userId) {
        return handleError2(
            res,
            'User does not belong to a store or user ID is missing. Please contact support if you believe this is an error.',
            StatusCodes.BAD_REQUEST
        );
    }
    if (!rawMaterialId) {
        return handleError2(res, 'Something went wrong', StatusCodes.BAD_REQUEST);
    }

    const {
        quantity, // Quantity in the user's unit (Presentation Unit, e.g., 10)
        unitOfMeasurementId, // The ID of the unit the quantity is measured in (e.g. Kilogram's ID)
        source, // Reason for the addition (e.g. 'purchase_receipt')
        documentRefId,
        notes
    } = req.body;

    // Validate required transaction fields
    if (quantity === undefined || unitOfMeasurementId === undefined || source === undefined || typeof quantity !== 'number' || quantity <= 0) {
        return handleError2(res, 'Quantity (must be > 0), Unit of measurement, and Source are required.', StatusCodes.BAD_REQUEST);
    }

    // Validate source against the enum
    if (!Object.values(rawMaterialTransactionSourceEnum.enumValues).includes(source as RawMaterialTransactionSource)) {
        return handleError2(res, `Invalid transaction source.`, StatusCodes.BAD_REQUEST);
    }

    try {
        // Verify that the raw material exists before proceeding
        const materialExists = await db.query.rawMaterials.findFirst({
            where: eq(rawMaterials.id, rawMaterialId),
        });

        if (!materialExists) {
            return handleError2(res, `Raw material with ID ${rawMaterialId} not found.`, StatusCodes.NOT_FOUND);
        }

        // Prepare Transaction Data
        const transactionData = {
            rawMaterialId: rawMaterialId,
            storeId: storeId,
            userId: userId,
            type: RawMaterialTransactionTypeEnum.COMING_IN,
            source: source as RawMaterialTransactionSource,
            documentRefId,
            notes
        };

        // Process Adjustment via Service
        const updatedInventory = await InventoryAdjustmentService.processStockAdjustment(
            transactionData,
            quantity, // Presentation quantity
            unitOfMeasurementId // Presentation unit ID
        );

        // Format and Return Response
        // (Similar to GET, calculate presentation quantity for response clarity)
        const unitRecord = await UnitConversionService.fetchUnitById(updatedInventory.rawMaterialId);

        // This is a quick fix, ideally, the service should return the unit, or the unit should be fetched once.
        const conversionFactor = unitRecord?.conversionFactorToBase || 1;

        return res.status(StatusCodes.OK).json({
            ...updatedInventory,
            currentQuantityPresentation: updatedInventory.quantity / conversionFactor,
        });

    } catch (error: any) {
        // Handle custom errors thrown by the service
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
            return handleError2(res, error.message, StatusCodes.NOT_FOUND, error);
        }

        return handleError2(
            res,
            'A server error occurred while processing the stock addition.',
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined
        );
    }
};
