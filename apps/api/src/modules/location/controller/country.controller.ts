import { NextFunction, Request, Response } from "express";
import { ilike, SQL } from "drizzle-orm";
import { countrySchema, countryService } from "../../location";

export default class CountryController {
    public index = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const queryOpts = req.queryOpts || {};
            const { search } = queryOpts;

            let customWhere: SQL | undefined = undefined;

            if (search) {
                customWhere = ilike(countrySchema.countryName, `%${search}%`);
            }

            const data = await countryService.getAllPaginated(customWhere, queryOpts);

            return res.status(200).json({
                message: "Country retrieved successfully.",
                data,
            });
        } catch (error) {
            next(error);
        }
    };
}
