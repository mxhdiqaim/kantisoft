/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from "express";
import { CustomRequest } from "../../types/express";
import { handleError2 } from "../../service/error-handling";
import { StatusCodes } from "http-status-codes";
import db from "../../shared/database";
import { rawMaterialTransactions } from "../../schema/raw-materials-schema/raw-material-stock-transaction-schema";
import { rawMaterials } from "../../schema/raw-materials-schema";
import { unitOfMeasurement } from "../../schema/unit-of-measurement-schema";
import { users } from "../../schema/users-schema";
import { eq, and, desc, inArray, SQL, gte, lte } from "drizzle-orm";
import { validateStoreAndExtractDates } from "../../utils/validate-store-dates";

/**
 * @description Retrieves the full transaction history (stock ledger) for a raw material in a store.
 * @route GET /api/v1/raw-materials/transactions/:id
 * @access Admin, Manager, Staff
 */
export const getStockTransactions = async (
    req: CustomRequest,
    res: Response,
) => {
    const currentUser = req.user?.data;
    const storeId = currentUser?.storeId;
    const { id: rawMaterialId } = req.params;

    if (!storeId) {
        return handleError2(
            res,
            "User does not have an associated store.",
            StatusCodes.BAD_REQUEST,
        );
    }
    if (!rawMaterialId) {
        return handleError2(
            res,
            "Missing rawMaterialId in request path.",
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

    try {
        // Multi-Join Query
        // Join Transactions -> RawMaterials -> Unit -> Users
        const results = await db
            .select({
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
                    conversionFactorToBase:
                        unitOfMeasurement.conversionFactorToBase,
                },
            })
            .from(rawMaterialTransactions)
            .innerJoin(
                rawMaterials,
                eq(rawMaterialTransactions.rawMaterialId, rawMaterials.id),
            )
            .innerJoin(
                unitOfMeasurement,
                eq(rawMaterials.unitOfMeasurementId, unitOfMeasurement.id),
            )
            .leftJoin(
                // Use left join just in case the userId is missing/null in future
                users,
                eq(rawMaterialTransactions.userId, users.id),
            )
            .where(
                and(
                    eq(rawMaterialTransactions.rawMaterialId, rawMaterialId),
                    eq(rawMaterialTransactions.storeId, storeId),
                ),
            )
            .orderBy(desc(rawMaterialTransactions.createdAt)) // Newest transactions first
            .execute();

        if (results.length === 0) {
            return res.status(StatusCodes.OK).json({
                message:
                    "No stock transaction history found for this material and store.",
            });
        }

        // Post-Processing and Conversion
        const transactionHistory = results.map((item) => {
            // CRITICAL: Convert Base Quantity back to Presentation Quantity for display
            const conversionFactor =
                item.unitOfMeasurement.conversionFactorToBase;
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
                performedBy: item.user || "System/Unknown",
                createdAt: item.createdAt,
                lastModifiedAt: item.lastModified,
            };
        });

        // Return Success Response
        return res.status(StatusCodes.OK).json(transactionHistory);
    } catch (error: any) {
        return handleError2(
            res,
            "A server error occurred while fetching stock transaction history.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @description Retrieves transaction logs for a specific raw material or the whole store.
 * @route GET /api/v1/raw-materials/transactions
 */
export const getRawMaterialInventoryTransactions = async (
    req: CustomRequest,
    res: Response,
) => {
    try {
        const validated = await validateStoreAndExtractDates(req, res);
        if (!validated) return; // Error already handled

        const {
            storeIds,
            finalStartDate,
            finalEndDate,
            periodUsed,
            storeQueryType,
        } = validated;

        const { rawMaterialId } = req.query; // Optional filter

        // Construct the Base WHERE clause (Store Filter)
        let whereClause: SQL | undefined = inArray(
            rawMaterialTransactions.storeId,
            storeIds,
        );

        // Apply the Date Filter (Copied from getInventoryTransactions)
        if (finalStartDate && finalEndDate) {
            whereClause = and(
                whereClause,
                gte(rawMaterialTransactions.transactionDate, finalStartDate),
                lte(rawMaterialTransactions.transactionDate, finalEndDate),
            );
        }

        // Add the Raw Material Filter if provided
        if (rawMaterialId && rawMaterialId !== "all") {
            whereClause = and(
                whereClause,
                eq(
                    rawMaterialTransactions.rawMaterialId,
                    rawMaterialId as string,
                ),
            );
        }

        const transactionLogs = await db
            .select({
                id: rawMaterialTransactions.id,
                type: rawMaterialTransactions.type,
                source: rawMaterialTransactions.source,
                quantityBase: rawMaterialTransactions.quantityBase,
                reference: rawMaterialTransactions.documentRefId,
                notes: rawMaterialTransactions.notes,
                transactionDate: rawMaterialTransactions.transactionDate, // Crucial for reporting
                createdAt: rawMaterialTransactions.createdAt,
                lastModified: rawMaterialTransactions.lastModified,

                user: {
                    // id: users.id,
                    firstName: users.firstName,
                    lastName: users.lastName,
                },
                rawMaterial: {
                    // id: rawMaterials.id,
                    name: rawMaterials.name,
                    latestUnitPrice: rawMaterials.latestUnitPrice,
                },

                // Unit Info (for conversion)
                unitOfMeasurement: {
                    // id: unitOfMeasurement.id,
                    // name: unitOfMeasurement.name,
                    symbol: unitOfMeasurement.symbol,
                    conversionFactorToBase:
                        unitOfMeasurement.conversionFactorToBase,
                },
            })
            .from(rawMaterialTransactions)
            .innerJoin(users, eq(rawMaterialTransactions.userId, users.id))
            .innerJoin(
                rawMaterials,
                eq(rawMaterialTransactions.rawMaterialId, rawMaterials.id),
            )
            .innerJoin(
                unitOfMeasurement,
                eq(rawMaterials.unitOfMeasurementId, unitOfMeasurement.id),
            )
            .where(whereClause) // Using the unified whereClause
            .orderBy(
                desc(rawMaterialTransactions.transactionDate),
                desc(rawMaterialTransactions.createdAt),
            );

        // Post-Processing and Conversion
        const transactionHistory = transactionLogs.map((item) => {
            const factor = item.unitOfMeasurement.conversionFactorToBase || 1;

            // Formula: Presentation = Base / Factor
            const quantityPresentation = Number(item.quantityBase) / factor;

            return {
                id: item.id,
                rawMaterialName: item.rawMaterial.name,

                // Display Values
                quantity: quantityPresentation,
                unitSymbol: item.unitOfMeasurement.symbol,

                // Transaction Details
                type: item.type,
                source: item.source,
                reference: item.reference,
                notes: item.notes,
                transactionDate: item.transactionDate,

                // Audit
                performedBy: `${item.user.firstName} ${item.user.lastName}`,
                createdAt: item.createdAt,
                lastModifiedAt: item.lastModified,
            };
        });

        return res.status(StatusCodes.OK).json({
            startDate: finalStartDate
                ? finalStartDate.toISOString()
                : "All Time",
            endDate: finalEndDate ? finalEndDate.toISOString() : "All Time",
            transactions: transactionHistory,
            timePeriod: periodUsed,
            storeQueryType,
        });
    } catch (error) {
        return handleError2(
            res,
            "Could not fetch raw material logs",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};
