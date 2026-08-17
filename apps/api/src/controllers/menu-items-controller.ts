/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, count, desc, eq, inArray, ne } from "drizzle-orm";
import { Response } from "express";
import { db } from "../shared/database";
import { menuItems } from "../schema/menu-items-schema";
import { generateUniqueItemCode } from "../shared/utils/generate-unique-item-code";
import { handleError2 } from "../service/error-handling";
import { CustomRequest } from "../types/express";
import { logActivity } from "../service/activity-logger";
import { StatusCodes } from "http-status-codes";
import { UserRoleEnum } from "../types/enums";
import { getStoreAndBranchIds } from "../service/store-service";
import { MenuItemCostingService } from "../service/menuitem-costing-service";
import { determineFinalStoreId } from "../shared/utils/store-permission-utils";
import { validateStoreAndExtractDates } from "../shared/utils/validate-store-dates";
import { categories } from "../schema/categories-schema";
import { generateSKU } from "../shared/utils";

/**
 * @desc    Get all menu items with pagination and role-based filtering.
 * @route   GET /api/v1/menu-items
 * @access  Private (Manager, Admin, User, Guest)
 * @query   page {number} - The page number for pagination.
 * @query   limit {number} - The number of items per page.
 */
export const getAllMenuItems = async (req: CustomRequest, res: Response) => {
    try {
        const validated = await validateStoreAndExtractDates(req, res);
        if (!validated) return;

        const { storeIds } = validated;
        const { page = "1", limit = "10" } = req.query;

        const pageNumber = parseInt(page as string, 10);
        const limitNumber = parseInt(limit as string, 10);
        const offset = (pageNumber - 1) * limitNumber;

        const whereClause = inArray(menuItems.storeId, storeIds);

        const [totalItemsResult] = await db.select({ value: count() }).from(menuItems).where(whereClause);
        const totalItems = totalItemsResult.value;

        const allMenuItems = await db.query.menuItems.findMany({
            where: whereClause,
            orderBy: [desc(menuItems.createdAt)],
            limit: limitNumber,
            offset: offset,
            with: {
                store: { columns: { name: true } },
                category: {
                    columns: {
                        id: true,
                        name: true,
                    },
                },
                inventory: {
                    columns: {
                        quantity: true,
                        status: true,
                        minStockLevel: true,
                        lastCountDate: true,
                    },
                },
            },
        });

        res.status(StatusCodes.OK).json({
            data: allMenuItems,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limitNumber),
                currentPage: pageNumber,
                itemsPerPage: limitNumber,
            },
        });
    } catch (error) {
        handleError2(
            res,
            "Problem loading menu items, please try again",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @desc    Get a single menu item by its ID.
 * @route   GET /api/v1/menu-items/:id
 */
export const getMenuItemById = async (req: CustomRequest, res: Response) => {
    try {
        const currentUser = req.user?.data;
        const userStoreId = currentUser?.storeId;
        const userRole = currentUser?.role;
        const { id: menuItemId } = req.params;

        if (!menuItemId) {
            return handleError2(res, "Menu item is required.", StatusCodes.BAD_REQUEST);
        }

        if (typeof menuItemId !== "string") {
            return handleError2(res, "Invalid menu item.", StatusCodes.BAD_REQUEST);
        }

        if (!userStoreId) {
            return handleError2(res, "Store association required.", StatusCodes.FORBIDDEN);
        }

        // Get the list of stores this user is allowed to "read" from
        // Managers can see items in their branches, others only their own store
        let allowedStoreIds: string[] = [userStoreId];
        if (userRole === UserRoleEnum.MANAGER) {
            const branchIds = await getStoreAndBranchIds(userStoreId);
            if (branchIds) allowedStoreIds = branchIds;
        }

        // Fetch the item with Category and Inventory relations
        const menuItem = await db.query.menuItems.findFirst({
            where: and(eq(menuItems.id, menuItemId), inArray(menuItems.storeId, allowedStoreIds)),
            with: {
                category: {
                    columns: { id: true, name: true },
                },
                store: {
                    columns: { name: true },
                },
                inventory: {
                    columns: {
                        quantity: true,
                        status: true,
                        minStockLevel: true,
                    },
                },
            },
        });

        if (!menuItem) {
            return handleError2(
                res,
                "Menu item not found or you do not have permission to view it.",
                StatusCodes.NOT_FOUND,
            );
        }

        res.status(StatusCodes.OK).json(menuItem);
    } catch (error) {
        handleError2(
            res,
            "Problem loading menu item details",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};
/**
 * @description Retrieves the calculated total raw material cost for a menu item.
 * @route GET /api/v1/menu-items/:id/cost
 * @access Admin, Manager
 */
export const getMenuItemCost = async (req: CustomRequest, res: Response) => {
    const currentUser = req.user?.data;
    const storeId = currentUser?.storeId;

    if (!storeId) {
        return handleError2(res, "You must be associated with a store to view menu items.", StatusCodes.FORBIDDEN);
    }

    const { id: menuItemId } = req.params;

    if (!menuItemId) {
        return handleError2(res, "Menu item is required.", StatusCodes.BAD_REQUEST);
    }

    if (typeof menuItemId !== "string") {
        return handleError2(res, "Invalid menu item.", StatusCodes.BAD_REQUEST);
    }

    if (!menuItemId) {
        return handleError2(res, "Something went wrong.", StatusCodes.BAD_REQUEST);
    }

    try {
        // Use the dedicated service to calculate the cost
        const totalCost = await MenuItemCostingService.calculateTotalRawMaterialCost(menuItemId);

        if (totalCost === null) {
            return res.status(StatusCodes.OK).json({
                message: "No Bill of Materials defined for this menu item. Cost is zero.",
            });
        }

        return res.status(StatusCodes.OK).json({
            menuItemId: menuItemId,
            totalRawMaterialCost: totalCost,
        });
    } catch (error: any) {
        return handleError2(
            res,
            "A server error occurred while calculating the menu item cost.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @desc    Create a new menu item.
 * @route   POST /api/v1/menu-items
 * @access  Private (Manager, Admin)
 * @body    name {string} - The name of the menu item.
 * @body    price {number} - The price of the menu item.
 // * @body    isAvailable {boolean} - [Optional] Availability of the item.
 * @body    itemCode {string} - [Optional] A unique code for the item.
 * @body    sku {string} - [Optional] SKU for internal tracking.
 * @body    categoryId {string} - [Optional] The ID of the category the item belongs to.
 * @query   targetStoreId {string} - For Managers: The ID of the store to add the item to.
 */
export const createMenuItem = async (req: CustomRequest, res: Response) => {
    try {
        const currentUser = req.user?.data;
        const storeId = currentUser?.storeId;
        const userRole = currentUser?.role;

        if (!storeId) {
            return handleError2(res, "Store not found for the authenticated user.", StatusCodes.FORBIDDEN);
        }

        const {
            name,
            price,
            // isAvailable,
            itemCode: providedItemCode,
            sku: providedSku,
            categoryId,
        } = req.body;

        const { targetStoreId } = req.query;

        const finalStoreId = await determineFinalStoreId(
            res,
            userRole as UserRoleEnum,
            storeId,
            targetStoreId as string,
        );
        if (!finalStoreId) return; // Error already handled

        if (!name || price === undefined) {
            return handleError2(res, "Name and price are required.", StatusCodes.BAD_REQUEST);
        }

        // Validate Category and Get Name for SKU
        let categoryName = "GEN";
        if (categoryId) {
            const category = await db.query.categories.findFirst({
                where: and(eq(categories.id, categoryId), eq(categories.storeId, finalStoreId)),
            });

            if (!category) {
                return handleError2(res, "Selected category not found in this store.", StatusCodes.NOT_FOUND);
            }

            categoryName = category.name;
        }

        // Name uniqueness check
        const existingItemByName = await db.query.menuItems.findFirst({
            where: and(eq(menuItems.name, name), eq(menuItems.storeId, finalStoreId)),
        });

        if (existingItemByName) {
            return handleError2(
                res,
                "Name already exists in this store. Please edit the menu item instead.",
                StatusCodes.CONFLICT,
            );
        }

        // Handle SKU Generation
        let finalSku = providedSku;
        if (!finalSku) {
            finalSku = generateSKU(categoryName, name);
        }

        // Check SKU uniqueness
        const existingSku = await db.query.menuItems.findFirst({
            where: and(eq(menuItems.sku, finalSku), eq(menuItems.storeId, finalStoreId)),
        });

        if (existingSku) {
            // If the auto-generated SKU somehow conflicts, append an extra random digit or return error
            return handleError2(
                res,
                "SKU already exists. Please provide a unique one or try again.",
                StatusCodes.CONFLICT,
            );
        }

        // Handle Item Code
        let finalItemCode: string;
        if (providedItemCode) {
            const existingCode = await db.query.menuItems.findFirst({
                where: and(eq(menuItems.itemCode, providedItemCode), eq(menuItems.storeId, finalStoreId)),
            });

            if (existingCode) {
                return handleError2(res, `Item code '${providedItemCode}' is already in use.`, StatusCodes.CONFLICT);
            }

            finalItemCode = providedItemCode;
        } else {
            finalItemCode = await generateUniqueItemCode();
        }

        // 6. Insert into Database
        const [newItem] = await db
            .insert(menuItems)
            .values({
                name,
                categoryId,
                sku: finalSku,
                itemCode: finalItemCode,
                price: String(price),
                // isAvailable: isAvailable ?? true,
                storeId: finalStoreId,
            })
            .returning();

        await logActivity({
            userId: currentUser.id,
            storeId: finalStoreId,
            action: "MENU_ITEM_CREATED",
            entityId: newItem.id,
            entityType: "menuItem",
            details: `Menu item "${newItem.name}" created with SKU: ${newItem.sku}`,
        });

        res.status(StatusCodes.CREATED).json(newItem);
    } catch (error: any) {
        if (error.cause?.code === "23505") {
            return handleError2(
                res,
                "A menu item with this name or item code already exists in the target store.",
                StatusCodes.CONFLICT,
                error instanceof Error ? error : undefined,
            );
        }
        handleError2(
            res,
            "Problem creating menu item, please try again.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @desc    Update an existing menu item.
 * @route   PATCH /api/v1/menu-items/:id
 * @access  Private (Manager, Admin - within their accessible stores)
 */
export const updateMenuItem = async (req: CustomRequest, res: Response) => {
    try {
        const currentUser = req.user?.data;
        const storeId = currentUser?.storeId;
        const userRole = currentUser?.role;

        if (!storeId) {
            return handleError2(res, "Store ID not found for the authenticated user.", StatusCodes.FORBIDDEN);
        }

        const { targetStoreId } = req.query;

        // Validate Store Access & Find Current Item
        const finalStoreId = await determineFinalStoreId(
            res,
            userRole as UserRoleEnum,
            storeId,
            targetStoreId as string,
        );
        if (!finalStoreId) return;

        const { id: menuItemId } = req.params;
        const { name, price, itemCode, sku, categoryId /*isAvailable */ } = req.body;

        if (!menuItemId) {
            return handleError2(res, "Menu item is required.", StatusCodes.BAD_REQUEST);
        }

        if (typeof menuItemId !== "string") {
            return handleError2(res, "Invalid menu item.", StatusCodes.BAD_REQUEST);
        }

        const currentItem = await db.query.menuItems.findFirst({
            where: and(eq(menuItems.id, menuItemId), eq(menuItems.storeId, finalStoreId)),
        });

        if (!currentItem) {
            return handleError2(res, "Menu item not found.", StatusCodes.NOT_FOUND);
        }

        const updateData: Record<string, any> = {};

        // Handle Name Change & SKU Regeneration Logic
        let shouldRegenerateSku = false;
        if (name && name !== currentItem.name) {
            // Check for name conflict
            const existing = await db.query.menuItems.findFirst({
                where: and(eq(menuItems.name, name), eq(menuItems.storeId, finalStoreId), ne(menuItems.id, menuItemId)),
            });

            if (existing) return handleError2(res, `Name '${name}' is already in use.`, StatusCodes.CONFLICT);

            updateData.name = name;
            shouldRegenerateSku = true; // Name changed, so SKU should update
        }

        // Handle Category Change
        let activeCategoryName = "";
        if (categoryId && categoryId !== currentItem.categoryId) {
            const category = await db.query.categories.findFirst({
                where: and(eq(categories.id, categoryId), eq(categories.storeId, finalStoreId)),
            });

            if (!category) return handleError2(res, "Selected category not found.", StatusCodes.NOT_FOUND);

            updateData.categoryId = categoryId;
            activeCategoryName = category.name;
            shouldRegenerateSku = true; // Category changed, so SKU should update
        }

        // Handle SKU Logic (Manual vs Auto)
        if (sku && sku !== currentItem.sku) {
            // User provided a manual SKU update
            const existingSku = await db.query.menuItems.findFirst({
                where: and(eq(menuItems.sku, sku), eq(menuItems.storeId, finalStoreId), ne(menuItems.id, menuItemId)),
            });

            if (existingSku)
                return handleError2(res, "This SKU is already assigned to another item.", StatusCodes.CONFLICT);

            updateData.sku = sku;
            shouldRegenerateSku = false; // Manual override stops auto-generation
        } else if (shouldRegenerateSku && !sku) {
            // Regenerate if the name / category changed and no manual SKU was provided in this request
            if (!activeCategoryName) {
                const category = await db.query.categories.findFirst({
                    where: eq(categories.id, categoryId || currentItem.categoryId!),
                });
                activeCategoryName = category?.name || "GEN";
            }
            updateData.sku = generateSKU(activeCategoryName, name || currentItem.name);
        }

        // Handle Item Code
        if (itemCode && itemCode !== currentItem.itemCode) {
            const existingCode = await db.query.menuItems.findFirst({
                where: and(
                    eq(menuItems.itemCode, itemCode),
                    eq(menuItems.storeId, finalStoreId),
                    ne(menuItems.id, menuItemId),
                ),
            });

            if (existingCode) return handleError2(res, "Item code is already in use.", StatusCodes.CONFLICT);
            updateData.itemCode = itemCode;
        }

        if (price !== undefined) updateData.price = String(price);
        // if (isAvailable !== undefined) updateData.isAvailable = isAvailable;

        if (Object.keys(updateData).length === 0) {
            return handleError2(res, "No changes provided.", StatusCodes.BAD_REQUEST);
        }

        updateData.lastModified = new Date();

        const [updatedItem] = await db
            .update(menuItems)
            .set(updateData)
            .where(eq(menuItems.id, menuItemId))
            .returning();

        await logActivity({
            userId: currentUser.id,
            storeId: finalStoreId,
            action: "MENU_ITEM_UPDATED",
            entityId: updatedItem.id,
            entityType: "menuItem",
            details: `Updated item "${updatedItem.name}". New SKU: ${updatedItem.sku}`,
        });

        res.status(StatusCodes.OK).json(updatedItem);
    } catch (error) {
        handleError2(
            res,
            "Problem updating menu item, please try again.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @desc    Delete a menu item.
 * @route   DELETE /api/v1/menu-items/:id
 * @access  Private (Manager, Admin)
 */
export const deleteMenuItem = async (req: CustomRequest, res: Response) => {
    try {
        const currentUser = req.user?.data;
        const storeId = currentUser?.storeId;
        const userRole = currentUser?.role;

        if (!storeId) {
            return handleError2(res, "Store association required.", StatusCodes.FORBIDDEN);
        }

        const { id: menuItemId } = req.params;
        const { targetStoreId } = req.query;

        if (!menuItemId) {
            return handleError2(res, "Menu item is required.", StatusCodes.BAD_REQUEST);
        }

        if (typeof menuItemId !== "string") {
            return handleError2(res, "Invalid menu item.", StatusCodes.BAD_REQUEST);
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
        // This ensures a manager from Store A can't delete an item from Store B via UUID guessing
        const [deletedItem] = await db
            .delete(menuItems)
            .where(and(eq(menuItems.id, menuItemId), eq(menuItems.storeId, finalStoreId)))
            .returning();

        if (!deletedItem) {
            return handleError2(
                res,
                "Menu item not found or you don't have permission to delete it.",
                StatusCodes.NOT_FOUND,
            );
        }

        // Log activity
        await logActivity({
            userId: currentUser.id,
            storeId: finalStoreId,
            action: "MENU_ITEM_DELETED",
            entityId: deletedItem.id,
            entityType: "menuItem",
            details: `Menu item "${deletedItem.name}" (SKU: ${deletedItem.sku}) was deleted.`,
        });

        res.status(StatusCodes.OK).json({
            message: "Menu item deleted successfully",
            deletedId: deletedItem.id,
        });
    } catch (error) {
        handleError2(
            res,
            "Problem deleting menu item, please try again.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};
