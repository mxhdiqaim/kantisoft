import { Request, Response, NextFunction } from "express";
import { locationService } from "../service";
import { requestContext } from "../../../shared/logger/context";

export default class LocationController {
    /**
     * STEP 3: CREATE LOCATION
     * The tenant exists, now the owner is setting up their first (or subsequent) branch.
     */
    public static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, address } = req.body;

            // Extract the securely injected tenantId from our AsyncLocalStorage context
            const context = requestContext.getStore();
            const tenantId = context?.tenantId;

            if (!tenantId) {
                return res.status(403).json({ error: "You must create a business before adding locations." });
            }

            if (!name) {
                return res.status(400).json({ error: "Location name is required." });
            }

            const newLocation = await locationService.createLocation({ name, address: address || null }, tenantId);

            return res.status(201).json({
                message: "Location created successfully.",
                data: newLocation,
            });
        } catch (error) {
            next(error);
        }
    }
}
