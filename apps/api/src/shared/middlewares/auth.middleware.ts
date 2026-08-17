import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { v4 as uuidv4 } from "uuid";
import { eq, and } from "drizzle-orm";
import { userLocationsSchema, userSchema } from "../../modules";
import { db } from "../database";
import { requestContext } from "../logger/context";
import { UserRoleEnum } from "../../modules/iam/interface";
import { UnauthorizedError, ForbiddenError } from "../errors/custom.error";

class AuthMiddleware {
    // Ensures the request contains a valid Clerk session.
    public static requireAuth(req: Request, res: Response, next: NextFunction) {
        const { isAuthenticated } = getAuth(req);

        if (!isAuthenticated) {
            return next(new UnauthorizedError("Authentication failed or missing."));
        }

        next();
    }

    /**
     * Resolves the user's business from the DB, validates location access,
     * and wraps the request in an AsyncLocalStorage context.
     */
    public static async withTenantContext(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId: clerkId } = getAuth(req);

            if (!clerkId) {
                return next(new UnauthorizedError("Authentication failed or missing."));
            }

            // Resolve the user from the database
            const [user] = await db
                .select({
                    id: userSchema.id,
                    tenantId: userSchema.tenantId,
                    role: userSchema.role,
                })
                .from(userSchema)
                .where(eq(userSchema.clerkId, clerkId))
                .limit(1);

            if (!user) {
                return next(new UnauthorizedError("User profile syncing. Please wait a moment."));
            }

            // Block if they haven't created a business yet
            if (!user.tenantId) {
                return next(new ForbiddenError("You must create a business before accessing this resource."));
            }

            // Extract and validate target location permissions
            const locationId = (req.headers["x-location-id"] as string) || undefined;

            if (locationId && user.role !== UserRoleEnum.OWNER) {
                const [assignment] = await db
                    .select()
                    .from(userLocationsSchema)
                    .where(and(eq(userLocationsSchema.userId, user.id), eq(userLocationsSchema.locationId, locationId)))
                    .limit(1);

                if (!assignment) {
                    return next(new ForbiddenError("You do not have permission to access this location."));
                }
            }

            // Trace & Context binding
            const requestId = (req.headers["x-request-id"] as string) || uuidv4();

            const context = {
                requestId,
                tenantId: user.tenantId,
                locationId,
                role: user.role,
            };

            // Execute the remainder of the request lifecycle within this context
            requestContext.run(context, () => {
                next();
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new AuthMiddleware();
