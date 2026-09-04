import { Request, Response, NextFunction } from "express";
import { BadRequestError, ForbiddenError, UnauthorizedError } from "../errors/custom.error";
import { requestContext } from "../logger/context";
import { UserRoleEnum } from "../../modules/iam/interface";

class BusinessMiddleware {
    public validateBusinessOwnership = (req: Request, res: Response, next: NextFunction): void => {
        try {
            const context = requestContext.getStore();

            if (!context) {
                throw new UnauthorizedError("Request context missing.");
            }

            const requestedBusinessId = (req.headers["x-business-id"] as string)?.split(",")[0]?.trim();

            if (!requestedBusinessId) {
                throw new BadRequestError("No business selected.");
            }

            // Must be an owner AND their token must match the requested business
            if (context.role !== UserRoleEnum.OWNER || context.businessId !== requestedBusinessId) {
                throw new ForbiddenError("You do not have permission to access or modify this business.");
            }

            return next();
        } catch (error) {
            next(error);
        }
    };
}

export default new BusinessMiddleware();
