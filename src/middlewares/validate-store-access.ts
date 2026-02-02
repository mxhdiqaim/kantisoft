import {NextFunction, Response} from "express";
import {handleError2} from "../service/error-handling";
import {CustomRequest} from "../types/express";
import {StatusCodes} from "http-status-codes";
import {determineFinalStoreId} from "../utils/store-permission-utils";
import {UserRoleEnum} from "../types/enums";

/**
 * Middleware to ensure that Admins and Users must be associated to a store.
 */
export const validateStoreAccess = async (
    req: CustomRequest,
    res: Response,
    next: NextFunction,
) => {
    try {
        const currentUser = req.user?.data; // req.user is typed from CustomRequest / global augmentation
        const storeId = currentUser?.storeId;
        const userRole = currentUser?.role;

        if (!storeId) {
            return handleError2(
                res,
                "Store association required.",
                StatusCodes.UNAUTHORIZED,
            );
        }

        const targetStoreId =
            (req.query.targetStoreId as string) ||
            (req.body.targetStoreId as string);

        const finalStoreId = await determineFinalStoreId(
            res,
            userRole as UserRoleEnum,
            storeId,
            targetStoreId,
        );

        if (!finalStoreId) return; // determineFinalStoreId already sent the response

        // Attach to request for use in controllers
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
