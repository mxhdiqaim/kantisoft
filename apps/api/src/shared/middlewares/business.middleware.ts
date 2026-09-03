import { Request, Response, NextFunction } from "express";
import { BadRequestError, ForbiddenError, UnauthorizedError } from "../errors/custom.error";
import { businessSchema, businessService } from "../../modules";
import { and, eq } from "drizzle-orm";

class BusinessMiddleware {
    public validateBusinessOwnership = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { user } = req;

            if (!user) {
                throw new UnauthorizedError("User not found or not authorised.");
            }

            const businessId = (req.headers["x-business-id"] as string)?.split(",")[0]?.trim();

            if (!businessId) {
                throw new BadRequestError("No business selected.");
            }

            const business = await businessService.getOrError(
                and(eq(businessSchema.id, businessId), eq(businessSchema.userId, user!.id)),
            );

            if (!business) {
                throw new ForbiddenError("You do not have access to this resource.");
            }

            // Attach business to the request for the controller to use
            req.business = business;
            return next();
        } catch (error) {
            next(error);
        }
    };
}

export default new BusinessMiddleware();
