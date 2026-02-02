import {and, desc, eq, inArray} from "drizzle-orm";
import {Response} from "express";
import db from "../db";
import {categories} from "../schema/categories-schema";
import {handleError2} from "../service/error-handling";
import {CustomRequest} from "../types/express";
import {StatusCodes} from "http-status-codes";
import {UserRoleEnum} from "../types/enums";
import {determineFinalStoreId} from "../utils/store-permission-utils";
import {validateStoreAndExtractDates} from "../utils/validate-store-dates";

/**
 * @desc    Get all categories for the active store(s)
 * @route   GET /api/v1/categories
 */
export const getAllCategories = async (req: CustomRequest, res: Response) => {
    try {
        const validated = await validateStoreAndExtractDates(req, res);
        if (!validated) return;

        const { storeIds } = validated;

        const allCategories = await db.query.categories.findMany({
            where: inArray(categories.storeId, storeIds),
            orderBy: [desc(categories.name)],
        });

        res.status(StatusCodes.OK).json(allCategories);
    } catch (error) {
        handleError2(
            res,
            "Failed to load categories",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @desc    Create a new product category
 * @route   POST /api/v1/categories
 */
export const createCategory = async (req: CustomRequest, res: Response) => {
    try {
        const currentUser = req.user?.data;
        const storeId = currentUser?.storeId;
        const userRole = currentUser?.role;

        if (!storeId) {
            return handleError2(
                res,
                "Store not found for the authenticated user.",
                StatusCodes.FORBIDDEN,
            );
        }

        const { name, description } = req.body;
        const { targetStoreId } = req.query;

        // Determine which store this category belongs to
        const finalStoreId = await determineFinalStoreId(
            res,
            userRole as UserRoleEnum,
            storeId,
            targetStoreId as string,
        );
        if (!finalStoreId) return; // Error already handled

        if (!name) {
            return handleError2(
                res,
                "Category name is required.",
                StatusCodes.BAD_REQUEST,
            );
        }

        // Check for duplicates in the SAME store
        const existingCategory = await db.query.categories.findFirst({
            where: and(
                eq(categories.name, name),
                eq(categories.storeId, finalStoreId),
            ),
        });

        if (existingCategory) {
            return handleError2(
                res,
                "A category with this name already exists in this store.",
                StatusCodes.CONFLICT,
            );
        }

        // Insert
        const [newCategory] = await db
            .insert(categories)
            .values({
                name,
                description,
                storeId: finalStoreId,
            })
            .returning();

        res.status(StatusCodes.CREATED).json(newCategory);
    } catch (error) {
        handleError2(
            res,
            "Failed to create category",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};
