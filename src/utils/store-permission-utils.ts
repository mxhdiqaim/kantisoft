import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { UserRoleEnum } from "../types/enums";
import { getStoreAndBranchIds } from "../service/store-service";
import { handleError2 } from "../service/error-handling";

/**
 * Determines and validates the final store ID based on a user role and a potential targetStoreId.
 * It handles permissions for ADMIN, MANAGER, and other roles.
 * If validation fails, it sends an HTTP error response and returns null.
 * @param res - The Express response object.
 * @param userRole - The role of the current user.
 * @param userStoreId - The store ID associated with the current user.
 * @param targetStoreId - The optional target store ID from the request query.
 * @returns The validated final store ID, or null if validation fails.
 */
export const determineFinalStoreId = async (
    res: Response,
    userRole: UserRoleEnum,
    userStoreId: string,
    targetStoreId: string | undefined,
): Promise<string | null> => {
    // Use the targetStoreId if provided, otherwise default to the user's own storeId.
    const effectiveStoreId =
        !targetStoreId || targetStoreId.trim() === ""
            ? userStoreId
            : targetStoreId;

    if (userRole === UserRoleEnum.MANAGER) {
        const storeIds = await getStoreAndBranchIds(userStoreId);
        if (!storeIds?.includes(effectiveStoreId)) {
            handleError2(
                res,
                "You do not have permission to perform this action in this store.",
                StatusCodes.FORBIDDEN,
            );

            return null;
        }
    } else if (effectiveStoreId !== userStoreId) {
        // Other roles can only operate within their own store
        handleError2(
            res,
            "You only have permission to perform this action in this store.",
            StatusCodes.FORBIDDEN,
        );

        return null;
    }

    return effectiveStoreId;
};


// import {Response} from "express";
// import {StatusCodes} from "http-status-codes";
// import {UserRoleEnum} from "../types/enums";
// import {getStoreAndBranchIds} from "../service/store-service";
// import {handleError2} from "../service/error-handling";
//
// /**
//  * Determines and validates the final store ID based on a user role and a potential targetStoreId.
//  * It handles permissions for ADMIN, MANAGER, and other roles.
//  * If validation fails, it sends an HTTP error response and returns null.
//  * @param res - The Express response object.
//  * @param userRole - The role of the current user.
//  * @param userStoreId - The store ID associated with the current user.
//  * @param targetStoreId - The optional target store ID from the request query.
//  * @returns The validated final store ID, or null if validation fails.
//  */
// export const determineFinalStoreId = async (
//     res: Response,
//     userRole: UserRoleEnum,
//     userStoreId: string,
//     targetStoreId: string | undefined,
// ): Promise<string | null> => {
//     if (!targetStoreId || targetStoreId.trim() === "") {
//         handleError2(res, "Error getting store data.", StatusCodes.BAD_REQUEST);
//
//         return null;
//     }
//
//     let finalStoreId = userStoreId;
//
//     if (userRole === UserRoleEnum.MANAGER) {
//         const storeIds = await getStoreAndBranchIds(userStoreId);
//         if (!storeIds?.includes(targetStoreId)) {
//             handleError2(
//                 res,
//                 "You do not have permission to perform this action in this store.",
//                 StatusCodes.FORBIDDEN,
//             );
//
//             return null;
//         }
//
//         finalStoreId = targetStoreId;
//     } else if (targetStoreId !== userStoreId) {
//         // Other roles can only operate within their own store
//         handleError2(
//             res,
//             "You only have permission to perform this action to this store.",
//             StatusCodes.FORBIDDEN,
//         );
//
//         return null;
//     }
//
//     finalStoreId = targetStoreId;
//
//     return finalStoreId;
// };
