import { Request, Response, NextFunction } from "express";
import { branchService } from "../service";
import { requestContext } from "../../../shared/logger/context";
import { BadRequestError, UnauthorizedError } from "../../../shared/errors/custom.error";

export default class LocationController {
    public create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { name, addressId } = req.body;

            // Extract businessId from the AsyncLocalStorage context
            const context = requestContext.getStore();
            const businessId = context?.businessId;

            if (!businessId) {
                throw new UnauthorizedError("Business context missing. Cannot create location.");
            }

            if (!name) {
                throw new BadRequestError("Location name is required.");
            }

            // Create the location tied strictly to this business
            const location = await branchService.create({
                businessId,
                name,
                addressId,
            });

            return res.status(201).json({
                message: "Location created successfully.",
                data: location,
            });
        } catch (error) {
            next(error);
        }
    };
}
