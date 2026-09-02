import { Request, Response, NextFunction } from "express";
import { locationService } from "../service";
import { requestContext } from "../../../shared/logger/context";
import { BadRequestError, UnauthorizedError } from "../../../shared/errors/custom.error";

export default class LocationController {
    public create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { name, address } = req.body;

            // Extract tenantId from the AsyncLocalStorage context
            const context = requestContext.getStore();
            const tenantId = context?.tenantId;

            if (!tenantId) {
                throw new UnauthorizedError("Tenant context missing. Cannot create location.");
            }

            if (!name) {
                throw new BadRequestError("Location name is required.");
            }

            // Create the location tied strictly to this tenant
            const location = await locationService.create({
                tenantId,
                name,
                address,
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
