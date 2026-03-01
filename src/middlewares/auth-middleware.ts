import { NextFunction, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { CustomRequest } from "../types/express";
import { handleError2 } from "../service/error-handling";
import { UserRoleEnum } from "../types/enums";
import jwt from "jsonwebtoken";
import { getEnvVariable } from "../utils";

const JWT_SECRET = getEnvVariable("JWT_SECRET");

/**
 * @desc Verifies the JWT token and attaches the user to the request
 */
export const authenticate = async (
    req: CustomRequest,
    res: Response,
    next: NextFunction,
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return handleError2(
                res,
                "Authentication token missing",
                StatusCodes.UNAUTHORIZED,
            );
        }

        const token = authHeader.split(" ")[1];

        // Use your existing secret key
        const decoded = jwt.verify(token, JWT_SECRET) as never;

        // Attach user data to request (assuming your token payload has a 'data' property)
        req.user = decoded;

        next();
    } catch (error) {
        return handleError2(
            res,
            "Invalid or expired token",
            StatusCodes.UNAUTHORIZED,
            error instanceof Error ? error : undefined,
        );
    }
};

/**
 * @desc Restricts access based on User Roles
 * @param roles Array of allowed roles (e.g., [UserRoleEnum.SUPER_ADMIN])
 */
export const restrictTo = (...roles: UserRoleEnum[]) => {
    return (req: CustomRequest, res: Response, next: NextFunction) => {
        const userRole = req.user?.data?.role;

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
