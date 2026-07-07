import { NextFunction, Response } from "express";
import { handleError2 } from "../../service/error-handling";
import { CustomRequest } from "../../types/express";
import { StatusCodes } from "http-status-codes";
import { determineFinalStoreId } from "../../utils/store-permission-utils";
import { UserRoleEnum } from "../../types/enums";

/**
 * Middleware to ensure that Admins and Users must be associated to a store.
 */
export const validateStoreAccess = async (
    req: CustomRequest,
    res: Response,
    next: NextFunction,
) => {
    try {
        const currentUser = req.user?.data;
        const userRole = currentUser?.role as UserRoleEnum;
        const userHomeStoreId = currentUser?.storeId;

        // If NOT a Super Admin and NO storeId, then block.
        // Super Admins are allowed to have no storeId.
        if (userRole !== UserRoleEnum.SUPER_ADMIN && !userHomeStoreId) {
            return handleError2(
                res,
                "Store association required.",
                StatusCodes.UNAUTHORIZED,
            );
        }

        const { targetStoreId } = req.query;

        // Logic for determining the Final ID
        let finalStoreId: string | null = null;

        if (userRole === UserRoleEnum.SUPER_ADMIN) {
            // Super Admin MUST provide a targetStoreId in the query to access store routes
            // e.g., /api/v1/inventory?targetStoreId=uuid-here
            if (!targetStoreId) {
                return handleError2(
                    res,
                    "Super Admin must specify a targetStoreId query parameter to access store-level data.",
                    StatusCodes.BAD_REQUEST,
                );
            }
            finalStoreId = targetStoreId as string;
        } else {
            // Regular users use the utility to check permissions
            finalStoreId = await determineFinalStoreId(
                res,
                userRole,
                userHomeStoreId!,
                targetStoreId as string,
            );
        }

        if (!finalStoreId) return;

        req.storeIds = [finalStoreId];
        next();
    } catch (error) {
        handleError2(
            res,
            "Store validation failed",
            StatusCodes.INTERNAL_SERVER_ERROR,
            error instanceof Error ? error : undefined,
        );
    }
};
