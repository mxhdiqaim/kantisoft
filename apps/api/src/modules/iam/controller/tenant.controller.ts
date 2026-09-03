import { Request, Response, NextFunction } from "express";
import { tenantService } from "../service";
import { getAuth } from "@clerk/express";

export default class TenantController {
    public get = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;

            const userId = req.user!.id;

            console.log("TenantController.get:");
            console.log({ id, userId });

            const data = await tenantService.getSingleTenant(id as string, userId);

            return res.status(200).json({
                message: "Tenant retrieved successfully.",
                data,
            });
        } catch (error) {
            next(error);
        }
    };

    public async create(req: Request, res: Response, next: NextFunction) {
        try {
            const { body } = req;
            const { userId: clerkId } = getAuth(req);

            // Construct the DTO expected by the refactored service
            const data = await tenantService.onboardNewBusiness({
                clerkUserId: clerkId!,
                ...body,
            });

            return res.status(201).json({
                message: "Tenant created successfully.",
                data,
            });
        } catch (error) {
            next(error);
        }
    }

    public update = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {
                params: { id },
                body,
                user,
            } = req;

            const data = await tenantService.update(String(id), body, user);

            return res.status(200).json({
                message: "Tenant updated successfully.",
                data,
            });
        } catch (error) {
            next(error);
        }
    };
}
