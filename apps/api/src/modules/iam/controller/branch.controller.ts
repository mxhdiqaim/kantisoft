import { Request, Response, NextFunction } from "express";
import { branchService } from "../service";

export default class BranchController {
    // public index = async (req: Request, res: Response, next: NextFunction) => {
    //     try {
    //         const {
    //             user: { id: userId, branchId },
    //             queryOpts: { search }
    //         } = req;
    //
    //         const data = await branchService.getAllPaginated();
    //
    //         return res.status(201).json({
    //             message: "Branch created successfully.",
    //             data,
    //         });
    //     } catch (error) {
    //         next(error);
    //     }
    // };

    public create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {
                user: { id: userId },
                body,
            } = req;

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
                user: { id: userId },
                params: { id: branchId },
                body,
            } = req;

            const data = await branchService.update(String(branchId), userId, body);

            return res.status(201).json({
                message: "Branch updated successfully.",
                data,
            });
        } catch (error) {
            next(error);
        }
    };
}
