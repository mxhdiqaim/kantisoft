/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from 'express';
import { CustomRequest } from "../../types/express";
import { handleError2 } from "../../service/error-handling";
import { StatusCodes } from "http-status-codes";
import db from "../../db";
import { rawMaterialStockTransactions } from '../../schema/raw-materials-schema/raw-material-stock-transaction-schema';
import { rawMaterials } from '../../schema/raw-materials-schema';
import { unitOfMeasurement } from '../../schema/unit-of-measurement-schema';
import { users } from '../../schema/users-schema'; // Assuming you have a user's schema
import { eq, and, desc } from 'drizzle-orm';

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
            id: rawMaterialStockTransactions.id,
            type: rawMaterialStockTransactions.type,
            source: rawMaterialStockTransactions.source,
            quantityBase: rawMaterialStockTransactions.quantityBase,
            documentRefId: rawMaterialStockTransactions.documentRefId,
            notes: rawMaterialStockTransactions.notes,
            createdAt: rawMaterialStockTransactions.createdAt,
            lastModified: rawMaterialStockTransactions.lastModified,

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
            .from(rawMaterialStockTransactions)
            .innerJoin(
                rawMaterials,
                eq(rawMaterialStockTransactions.rawMaterialId, rawMaterials.id)
            )
            .innerJoin(
                unitOfMeasurement,
                eq(rawMaterials.unitOfMeasurementId, unitOfMeasurement.id)
            )
            .leftJoin( // Use left join just in case the userId is missing/null in future
                users,
                eq(rawMaterialStockTransactions.userId, users.id)
            )
            .where(and(
                eq(rawMaterialStockTransactions.rawMaterialId, rawMaterialId),
                eq(rawMaterialStockTransactions.storeId, storeId)
            ))
            .orderBy(desc(rawMaterialStockTransactions.createdAt)) // Newest transactions first
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