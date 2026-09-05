import { Request, Response, NextFunction } from "express";
import { businessService } from "../service";
import { requestContext } from "../../../shared/logger/context";
import { businessSchema } from "../schema";
import { and, eq } from "drizzle-orm";

export default class BusinessController {
    public get = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const context = requestContext.getStore();
            const userId = context!.userId;

            const data = await businessService.getOrError(
                and(eq(businessSchema.id, String(id)), eq(businessSchema.userId, userId)),
            );

            return res.status(200).json({
                message: "Business retrieved successfully.",
                data,
            });
        } catch (error) {
            next(error);
        }
    };

    public async create(req: Request, res: Response, next: NextFunction) {
        try {
            const { body } = req;
            const context = requestContext.getStore();

            const userId = context!.userId;

            const data = await businessService.onboardNewBusiness(userId, body);

            return res.status(201).json({
                message: "Business created successfully.",
                data,
            });
        } catch (error) {
            next(error);
        }
    }

    public update = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { body } = req;
            const context = requestContext.getStore();

            // Pass the context userId instead of the old req.user object
            const data = await businessService.update(String(id), context!.userId, body);

            return res.status(200).json({
                message: "Business updated successfully.",
                data,
            });
        } catch (error) {
            next(error);
        }
    };
}
