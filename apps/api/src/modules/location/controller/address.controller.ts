import { NextFunction, Request, Response } from "express";
import { ilike, SQL } from "drizzle-orm";
import { addressSchema } from "../schema";
import { addressService } from "../service";

export default class AddressController {
    public index = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const queryOpts = req.queryOpts || {};
            const { search } = queryOpts;

            let customWhere: SQL | undefined = undefined;

            if (search) {
                customWhere = ilike(addressSchema.street, `%${search}%`);
            }

            const data = await addressService.getAllPaginated(customWhere, queryOpts);

            return res.status(200).json({
                message: "Address retrieved successfully.",
                data,
            });
        } catch (error) {
            next(error);
        }
    };
}
