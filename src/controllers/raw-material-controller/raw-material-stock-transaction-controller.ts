/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from 'express';
import { CustomRequest } from "../../types/express";
import { handleError2 } from "../../service/error-handling";
import { StatusCodes } from "http-status-codes";
import db from "../../db";
import { rawMaterialTransactions } from "../../schema/raw-materials-schema/raw-material-stock-transaction-schema";
import { rawMaterials } from '../../schema/raw-materials-schema';
import { unitOfMeasurement } from '../../schema/unit-of-measurement-schema';
import { users } from '../../schema/users-schema'; // Assuming you have a user's schema
import { eq, and, desc } from 'drizzle-orm';
import { determineFinalStoreId } from "../../utils/store-permission-utils";
import { UserRoleEnum } from "../../types/enums";

/**
 * @description Retrieves the full transaction history (stock ledger) for a raw material in a store.
 * @route GET /api/v1/raw-materials/transactions/:id
 * @access Admin, Manager, Staff
 */
export const getStockTransactions = async (req: CustomRequest, res: Response) => {
    const currentUser = req.user?.data;
    const storeId = currentUser?.storeId;
    const { id: rawMaterialId } = req.params;

    if (!storeId) {
        return handleError2(res, 'User does not have an associated store.', StatusCodes.BAD_REQUEST);
    }
    if (!rawMaterialId) {
        return handleError2(res, 'Missing rawMaterialId in request path.', StatusCodes.BAD_REQUEST);
    }

    try {
        // Multi-Join Query
        // Join Transactions -> RawMaterials -> Unit -> Users
        const results = await db.select({
            // Transaction Fields
            id: rawMaterialTransactions.id,
            type: rawMaterialTransactions.type,
            source: rawMaterialTransactions.source,
            quantityBase: rawMaterialTransactions.quantityBase,
            documentRefId: rawMaterialTransactions.documentRefId,
            notes: rawMaterialTransactions.notes,
            createdAt: rawMaterialTransactions.createdAt,
            lastModified: rawMaterialTransactions.lastModified,

            // Raw Material Info
            rawMaterialName: rawMaterials.name,

            // User Info (Audit)
            user: {
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email,
                storeId: users.storeId,
                role: users.role,
            },

            // Unit Info (for conversion)
            unitOfMeasurement: {
                id: unitOfMeasurement.id,
                name: unitOfMeasurement.name,
                symbol: unitOfMeasurement.symbol,
                conversionFactorToBase: unitOfMeasurement.conversionFactorToBase,
            }
        })
            .from(rawMaterialTransactions)
            .innerJoin(
                rawMaterials,
                eq(rawMaterialTransactions.rawMaterialId, rawMaterials.id)
            )
            .innerJoin(
                unitOfMeasurement,
                eq(rawMaterials.unitOfMeasurementId, unitOfMeasurement.id)
            )
            .leftJoin( // Use left join just in case the userId is missing/null in future
                users,
                eq(rawMaterialTransactions.userId, users.id)
            )
            .where(and(
                eq(rawMaterialTransactions.rawMaterialId, rawMaterialId),
                eq(rawMaterialTransactions.storeId, storeId)
            ))
            .orderBy(desc(rawMaterialTransactions.createdAt)) // Newest transactions first
            .execute();

        if (results.length === 0) {
            return res.status(StatusCodes.OK).json({ message: "No stock transaction history found for this material and store." });
        }

        // Post-Processing and Conversion
        const transactionHistory = results.map(item => {

            // CRITICAL: Convert Base Quantity back to Presentation Quantity for display
            const conversionFactor = item.unitOfMeasurement.conversionFactorToBase;
            const quantityPresentation = item.quantityBase / conversionFactor;

            return {
                id: item.id,
                rawMaterialName: item.rawMaterialName,

                // Display Quantity (e.g., 50 kg)
                quantity: quantityPresentation,
                unitSymbol: item.unitOfMeasurement.symbol,

                // Transaction Details
                type: item.type, // 'in' or 'out'
                source: item.source,
                documentRefId: item.documentRefId,
                notes: item.notes,

                // Audit
                performedBy: item.user || 'System/Unknown',
                createdAt: item.createdAt,
                lastModifiedAt: item.lastModified,
            };
        });

        // Return Success Response
        return res.status(StatusCodes.OK).json(transactionHistory);

    } catch (error: any) {
        return handleError2(
            res,
            'A server error occurred while fetching stock transaction history.',
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined
        );
    }
}

/**
 * @description Retrieves transaction logs for a specific raw material or the whole store.
 * @route GET /api/v1/raw-materials/transactions
 */
export const getRawMaterialInventoryTransactions = async (req: CustomRequest, res: Response) => {
    const currentUser = req.user?.data;
    const storeId = currentUser?.storeId;

    if (!storeId) {
        return handleError2(res, "Store association required.", StatusCodes.FORBIDDEN);
    }

    const userRole = currentUser?.role;
    const { rawMaterialId, targetStoreId } = req.query; // Optional filter

    const finalStoreId = await determineFinalStoreId(res, userRole as UserRoleEnum, storeId, targetStoreId as string);
    if (!finalStoreId) return;

    try {
        const logs = await db.select({
            id: rawMaterialTransactions.id,
            type: rawMaterialTransactions.type, // 'COMING_IN' or 'GOING_OUT'
            source: rawMaterialTransactions.source,
            quantity: rawMaterialTransactions.quantityBase,
            reference: rawMaterialTransactions.documentRefId,
            notes: rawMaterialTransactions.notes,

            createdAt: rawMaterialTransactions.createdAt,
            lastModified: rawMaterialTransactions.lastModified,

            users: {
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
            },
            rawMaterial: {
                id: rawMaterials.id,
                name: rawMaterials.name,
                unitOfMeasurementId: rawMaterials.unitOfMeasurementId,
                description: rawMaterials.description,
                latestUnitPrice: rawMaterials.latestUnitPrice,
                status: rawMaterials.status,
            },
        })
            .from(rawMaterialTransactions)
            .innerJoin(users, eq(rawMaterialTransactions.userId, users.id))
            .innerJoin(rawMaterials, eq(rawMaterialTransactions.rawMaterialId, rawMaterials.id))
            .where(
                and(
                    eq(rawMaterialTransactions.storeId, finalStoreId),
                    // Only filter by material if the ID is provided
                    rawMaterialId ? eq(rawMaterialTransactions.rawMaterialId, rawMaterialId as string) : undefined
                )
            )
            .orderBy(desc(rawMaterialTransactions.lastModified));

        return res.status(StatusCodes.OK).json(logs);
    } catch (error) {
        return handleError2(
            res,
            'Could not fetch logs',
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined
        );
    }
};