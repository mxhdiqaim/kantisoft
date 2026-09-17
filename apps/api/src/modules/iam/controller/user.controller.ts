import { Request, Response, NextFunction } from "express";
import { userService } from "../service";
import { requestContext } from "../../../shared/logger/context";
import { ilike, SQL, or } from "drizzle-orm";
import { userSchema } from "../schema";
import { UnauthorizedError } from "../../../shared/errors/custom.error";

export default class UserController {
    public index = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const queryOpts = req.queryOpts || {};
            const { search } = queryOpts;

            let customWhere: SQL | undefined = undefined;

            if (search) {
                customWhere = or(
                    ilike(userSchema.firstName, `%${search}%`),
                    ilike(userSchema.lastName, `%${search}%`),
                    ilike(userSchema.email, `%${search}%`),
                );
            }

            const data = await userService.getAllPaginated(customWhere, queryOpts);

            return res.status(200).json({
                message: "Users retrieved successfully.",
                data,
            });
        } catch (error) {
            next(error);
        }
    };

    public inviteStaff = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { body } = req;

            const context = requestContext.getStore();
            const businessId = context?.businessId;

            const invitation = await userService.inviteUser({
                ...body,
                businessId: String(businessId),
            });

            return res.status(200).json({
                message: "Staff invited successfully.",
                data: invitation,
            });
        } catch (error) {
            next(error);
        }
    };

    public getMe = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const context = requestContext.getStore();
            const userId = context?.userId;

            if (!userId) {
                throw new UnauthorizedError("User info missing from authentication context.");
            }

            const data = await userService.getByIdOrError(String(userId));

            return res.status(200).json({
                message: "User profile retrieved successfully.",
                data,
            });
        } catch (error) {
            next(error);
        }
    };
}
