import { Request, Response, NextFunction } from "express";
import { ForbiddenError, UnauthorizedError } from "../errors/custom.error";
import { requestContext } from "../logger/context";
import { UserRoleEnum } from "../../modules/iam/interface";

class BusinessMiddleware {
    public validateBusinessOwnership = (req: Request, res: Response, next: NextFunction): void => {
        try {
            const context = requestContext.getStore();

            if (!context) {
                throw new UnauthorizedError("Request context missing.");
            }

            if (context.role !== UserRoleEnum.OWNER) {
                throw new ForbiddenError("You can not modify business settings.");
            }

            if (!context.businessId) {
                throw new ForbiddenError("You do not have an active business.");
            }

            // Compare the business ID in the URL (e.g., PATCH /business/:id) to the one in their token
            const targetBusinessId = req.params.id;

            if (targetBusinessId && context.businessId !== targetBusinessId) {
                throw new ForbiddenError("You do not have permission to access or modify this business.");
            }

            return next();
        } catch (error) {
            next(error);
        }
    };
}

export default new BusinessMiddleware();
