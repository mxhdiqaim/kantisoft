import { NextFunction, Request, Response } from "express";
import { z, ZodError, ZodSchema } from "zod";
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

    /**
     * Higher-order middleware to validate the request body against a provided Zod schema.
     * @param schema The Zod schema to validate against
     * @param isRequired Whether the body is mandatory (default: true)
     */
    public validateRequestBody = (schema: ZodSchema, isRequired: boolean = true) => {
        return (req: Request, res: Response, next: NextFunction): void => {
            try {
                const isBodyEmpty = !req.body || Object.keys(req.body).length === 0;

                // Body is required but missing
                if (isRequired && isBodyEmpty) {
                    throw new BadRequestError("Request body is required.");
                }

                // Body is optional and missing
                if (!isRequired && isBodyEmpty) {
                    return next();
                }

                req.body = schema.parse(req.body);

                next();
            } catch (error) {
                if (error instanceof ZodError) {
                    const errorMessages = error.issues.map((issue) => ({
                        // Fallback to "body" if the path is empty (e.g., expecting an array but got an object)
                        field: issue.path.join(".") || "body",
                        message: issue.message,
                    }));
                    return next(new BadRequestError("Invalid request body", errorMessages));
                }
                next(error);
            }
        };
    };
}

export default new SystemMiddleware();
