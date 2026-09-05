import { Request, Response, NextFunction } from "express";
import { branchService } from "../service";
import { requestContext } from "../../../shared/logger/context";
import { ilike, SQL } from "drizzle-orm";
import { branchSchema } from "../schema";

export default class BranchController {
    public index = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { queryOpts } = req;

            const { search } = queryOpts || {};

            let customWhere: SQL;
            if (search) {
                customWhere = ilike(branchSchema.name, `%${search}%`);
            }

            const data = await branchService.getAllPaginated(customWhere!, req.queryOpts!);

            return res.status(200).json({
                message: "Branches retrieved successfully.",
                data,
            });
        } catch (error) {
            next(error);
        }
    };

    public create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { body } = req;
            const context = requestContext.getStore();

            const userId = context!.userId;

            const data = await branchService.create(userId, body);

            return res.status(201).json({
                message: "Branch created successfully.",
                data,
            });
        } catch (error) {
            next(error);
        }
    };

    public update = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {
                params: { id: branchId },
                body,
            } = req;

            const context = requestContext.getStore();
            const userId = context!.userId;

            const data = await branchService.update(String(branchId), userId, body);

            return res.status(200).json({
                // Changed to 200 OK (201 is usually for creation)
                message: "Branch updated successfully.",
                data,
            });
        } catch (error) {
            next(error);
        }
    };
}
