import { Request, Response, NextFunction } from "express";
import { tenantService } from "../service";
import { getAuth } from "@clerk/express";

export default class TenantController {
    public async create(req: Request, res: Response, next: NextFunction) {
        try {
            const { businessName } = req.body;
            // Clerk Express middleware automatically attaches the user's Clerk ID to req.auth
            const { userId: clerkId } = getAuth(req);

            if (!clerkId) {
                return res.status(401).json({ error: "Authentication required." });
            }

            if (!businessName) {
                return res.status(400).json({ error: "Business name is required." });
            }

            const data = await tenantService.onboardNewBusiness(businessName, clerkId);

            return res.status(201).json({
                message: "Tenant created successfully.",
                data,
            });
        } catch (error) {
            next(error);
        }
    }
}
