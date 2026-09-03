import { Request, Response, NextFunction } from "express";
import { businessService } from "../service";
import { getAuth } from "@clerk/express";

export default class BusinessController {
    public get = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;

            const userId = req.user!.id;

            const data = await businessService.getSingleSingle(id as string, userId);

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
            const { userId: clerkId } = getAuth(req);

            // Construct the DTO expected by the refactored service
            const data = await businessService.onboardNewBusiness({
                clerkUserId: clerkId!,
                ...body,
            });

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
            const {
                params: { id },
                body,
                user,
            } = req;

            const data = await businessService.update(String(id), body, user);

            return res.status(200).json({
                message: "Business updated successfully.",
                data,
            });
        } catch (error) {
            next(error);
        }
    };
}
