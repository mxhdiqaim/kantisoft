import { Request, Response, NextFunction } from "express";
import { userService } from "../service";
import { requestContext } from "../../../shared/logger/context";
import { ilike, SQL, or, eq } from "drizzle-orm";
import { userSchema } from "../schema";
import { NotFoundError } from "../../../shared/errors/custom.error";

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

            let data;

            // Try fetching by internal userId
            if (context?.userId) {
                data = userService.get(eq(userSchema.id, context.userId));
            }
            // Fallback to ClerkId (Syncing/Onboarding Flow)
            else if (context?.clerkId) {
                data = userService.get(eq(userSchema.clerkId, context.clerkId));
            }

            // Webhook still running? Throw a 404 (NOT 401!) so TanStack Query retries without logging out.
            if (!data) {
                throw new NotFoundError("User profile is still syncing.");
            }

            return res.status(200).json({
                message: "User data retrieved successfully!",
                data,
            });
        } catch (error) {
            next(error);
        }
    };
}
