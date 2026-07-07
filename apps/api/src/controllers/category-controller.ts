import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { Response } from "express";
import db from "../shared/database";
import { categories } from "../schema/categories-schema";
import { handleError2 } from "../service/error-handling";
import { CustomRequest } from "../types/express";
import { StatusCodes } from "http-status-codes";
import { UserRoleEnum } from "../types/enums";
import { determineFinalStoreId } from "../utils/store-permission-utils";
import { validateStoreAndExtractDates } from "../utils/validate-store-dates";

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
 * @route   POST /api/v1/categories/create
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

/**
 * @desc    Update an existing category
 * @route   PATCH /api/v1/categories/:id
 */
export const updateCategory = async (req: CustomRequest, res: Response) => {
    try {
        const currentUser = req.user?.data;
        const storeId = currentUser?.storeId;
        const userRole = currentUser?.role;

        if (!storeId) {
            return handleError2(res, "Store not found.", StatusCodes.FORBIDDEN);
        }

        const { id: categoryId } = req.params;
        const { name, description } = req.body;
        const { targetStoreId } = req.query;

        if (!categoryId) {
            return handleError2(
                res,
                "Category is required.",
                StatusCodes.BAD_REQUEST,
            );
        }

        if (typeof categoryId !== "string") {
            return handleError2(
                res,
                "Invalid category.",
                StatusCodes.BAD_REQUEST,
            );
        }

        // Determine permission-based Store ID
        const finalStoreId = await determineFinalStoreId(
            res,
            userRole as UserRoleEnum,
            storeId,
            targetStoreId as string,
        );
        if (!finalStoreId) return;

        // Find a category and verify it belongs to the target store
        const categoryToUpdate = await db.query.categories.findFirst({
            where: and(
                eq(categories.id, categoryId),
                eq(categories.storeId, finalStoreId),
            ),
        });

        if (!categoryToUpdate) {
            return handleError2(
                res,
                "Category not found in this store.",
                StatusCodes.NOT_FOUND,
            );
        }

        const updateData: Partial<typeof categories.$inferInsert> = {};

        // Name conflict check (Scoped to the same store)
        if (name && name !== categoryToUpdate.name) {
            const existing = await db.query.categories.findFirst({
                where: and(
                    eq(categories.name, name),
                    eq(categories.storeId, finalStoreId),
                    ne(categories.id, categoryId),
                ),
            });

            if (existing) {
                return handleError2(
                    res,
                    `Category "${name}" already exists.`,
                    StatusCodes.CONFLICT,
                );
            }
            updateData.name = name;
        }

        if (description !== undefined) updateData.description = description;
        if (Object.keys(updateData).length === 0) {
            return handleError2(
                res,
                "No changes provided.",
                StatusCodes.BAD_REQUEST,
            );
        }

        updateData.lastModified = new Date();

        // Update scoped by ID and StoreID
        const [updatedCategory] = await db
            .update(categories)
            .set(updateData)
            .where(
                and(
                    eq(categories.id, categoryId),
                    eq(categories.storeId, finalStoreId),
                ),
            )
            .returning();

        res.status(StatusCodes.OK).json(updatedCategory);
    } catch (error) {
        handleError2(
            res,
            "Problem updating category",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @desc    Delete a category
 * @route   DELETE /api/v1/categories/:id
 */
export const deleteCategory = async (req: CustomRequest, res: Response) => {
    try {
        const currentUser = req.user?.data;
        const storeId = currentUser?.storeId;
        const userRole = currentUser?.role;

        if (!storeId) {
            return handleError2(res, "Store not found.", StatusCodes.FORBIDDEN);
        }

        const { id: categoryId } = req.params;
        const { targetStoreId } = req.query;

        if (!categoryId) {
            return handleError2(
                res,
                "Category is required.",
                StatusCodes.BAD_REQUEST,
            );
        }

        if (typeof categoryId !== "string") {
            return handleError2(
                res,
                "Invalid category.",
                StatusCodes.BAD_REQUEST,
            );
        }

        // Determine permission-based Store ID
        const finalStoreId = await determineFinalStoreId(
            res,
            userRole as UserRoleEnum,
            storeId,
            targetStoreId as string,
        );
        if (!finalStoreId) return;

        // Perform delete scoped by ID and StoreID
        const deletedCategory = await db
            .delete(categories)
            .where(
                and(
                    eq(categories.id, categoryId),
                    eq(categories.storeId, finalStoreId),
                ),
            )
            .returning();

        if (deletedCategory.length === 0) {
            return handleError2(
                res,
                "Category not found or permission denied.",
                StatusCodes.NOT_FOUND,
            );
        }

        res.status(StatusCodes.OK).json({
            message: "Category deleted successfully.",
        });
    } catch (error) {
        handleError2(
            res,
            "Problem deleting category",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};
