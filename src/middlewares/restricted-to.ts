import {NextFunction, Response} from "express";
import {StatusCodes} from "http-status-codes";
import {CustomRequest} from "../types/express";
import {handleError2} from "../service/error-handling";
import {UserRoleEnum} from "../types/enums";

/**
 * @desc Restricts access based on User Roles
 * @param roles Array of allowed roles (e.g., [UserRoleEnum.SUPER_ADMIN])
 */
export const restrictTo = (...roles: UserRoleEnum[]) => {
    return (req: CustomRequest, res: Response, next: NextFunction) => {
        const currentUser = req.user?.data; // Check if it's req.user.data or just req.user
        const userRole = currentUser?.role;

        if (!userRole || !roles.includes(userRole as UserRoleEnum)) {
            return handleError2(
                res,
                "You do not have permission to perform this action",
                StatusCodes.FORBIDDEN,
            );
        }

        next();
    };
};
