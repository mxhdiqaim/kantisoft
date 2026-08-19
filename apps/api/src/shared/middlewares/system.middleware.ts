import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { BadRequestError } from "../errors/custom.error";

class SystemMiddleware {
    public formatRequestQuery = (req: Request, res: Response, next: NextFunction): void => {
        try {
            const querySchema = z
                .object({
                    page: z.coerce.number().int().min(1).default(1),
                    limit: z.coerce.number().int().min(1).max(500).default(10),
                    search: z.string().trim().optional(),
                    sortBy: z.string().trim().optional(),
                    sortOrder: z
                        .enum(["ASC", "DESC", "asc", "desc"])
                        .default("ASC")
                        .transform((val) => val.toUpperCase() as "ASC" | "DESC"),
                })
                .passthrough();

            const parsed = querySchema.parse(req.query);

            const page = parsed.page;
            const limit = parsed.limit;
            const offset = (page - 1) * limit;

            req.queryOpts = {
                ...parsed,
                offset,
            };

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errorMessages = error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                }));
                return next(new BadRequestError("Invalid query parameters", errorMessages));
            }
            next(error);
        }
    };
}

export default new SystemMiddleware();
