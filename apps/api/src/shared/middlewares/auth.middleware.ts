import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { eq, and } from "drizzle-orm";
import { db } from "../database";
import { requestContext } from "../logger/context";
import { UserRoleEnum } from "../../modules/iam/interface";
import { UnauthorizedError, ForbiddenError, BadRequestError } from "../errors/custom.error";
import { locationSchema, businessSchema, userLocationsSchema, userSchema } from "../../modules";
import { v4 as uuidv7 } from "uuid";
import { helperUtil } from "../utils";
import { EnvironmentVariablesEnum } from "../interface";

class AuthMiddleware {
    private readonly NODE_ENV = helperUtil.getEnvVariable("NODE_ENV");
    private readonly CLERK_USER_ID = helperUtil.getEnvVariable("CLERK_USER_ID");
    private readonly DEVELOPMENT_TOKEN = helperUtil.getEnvVariable("DEVELOPMENT_TOKEN");

    // Verifies the Clerk token, fetches the user from the database, and attaches it to req.user.
    public requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const authHeader = req.headers.authorization;

            let clerkId: string | null = null;

            // THE DEV-MODE BACKDOOR FOR POSTMAN
            if (
                this.NODE_ENV === EnvironmentVariablesEnum.DEVELOPMENT &&
                authHeader === `Bearer ${this.DEVELOPMENT_TOKEN}`
            ) {
                clerkId = this.CLERK_USER_ID;
            } else {
                // Normal Clerk Flow for Frontend / Production
                const auth = getAuth(req);
                if (!auth.isAuthenticated || !auth.userId) {
                    throw new UnauthorizedError("Authentication failed or missing.");
                }
                clerkId = auth.userId;
            }

            // Now, fetch the user from the DB regardless of whether the ID came from Clerk or the backdoor
            const [user] = await db.select().from(userSchema).where(eq(userSchema.clerkId, clerkId)).limit(1);

            if (!user) {
                throw new UnauthorizedError("User profile syncing. Please wait a moment.");
            }

            // Attach user to the request object for downstream use
            req.user = user;
            return next();
        } catch (error) {
            next(error);
        }
    };

    // Validates if the authenticated user has access to the requested tenant/location via headers.
    public validateAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = req.user;

            if (!user) {
                throw new UnauthorizedError("User not found on request. Ensure requireAuth runs first.");
            }

            const tenantId = req.headers["x-tenant-id"] as string;
            const locationId = req.headers["x-location-id"] as string;

            if (!tenantId) {
                throw new BadRequestError("No tenant (business) selected.");
            }

            // --- OWNER ACCESS VALIDATION ---
            if (user.role === UserRoleEnum.OWNER) {
                const [tenant] = await db
                    .select()
                    .from(businessSchema)
                    .where(and(eq(businessSchema.id, tenantId), eq(businessSchema.userId, user.id)))
                    .limit(1);

                if (tenant) {
                    req.tenant = tenant;

                    if (locationId) {
                        const [location] = await db
                            .select()
                            .from(locationSchema)
                            .where(and(eq(locationSchema.id, locationId), eq(locationSchema.tenantId, tenantId)))
                            .limit(1);

                        if (!location) {
                            throw new ForbiddenError(
                                "The requested branch does not exist in your business or you don't have permission",
                            );
                        }
                        req.location = location;
                    }

                    // Wrap in your context logger and continue
                    return this.runWithContext(req, next);
                }
            }

            // --- STAFF ACCESS VALIDATION ---
            // If the code reaches here, either the user is STAFF, or an OWNER trying to access a tenant they don't own.
            if (!locationId) {
                throw new BadRequestError("No branch selected for staff access.");
            }

            const [staffContext] = await db
                .select({
                    location: locationSchema,
                    tenant: businessSchema,
                })
                .from(userLocationsSchema)
                .innerJoin(locationSchema, eq(userLocationsSchema.locationId, locationSchema.id))
                .innerJoin(businessSchema, eq(locationSchema.tenantId, businessSchema.id))
                .where(
                    and(
                        eq(userLocationsSchema.userId, user.id),
                        eq(userLocationsSchema.locationId, locationId),
                        eq(locationSchema.tenantId, tenantId),
                    ),
                )
                .limit(1);

            if (!staffContext) {
                throw new ForbiddenError("You do not have access to this branch or business.");
            }

            req.tenant = staffContext.tenant;
            req.location = staffContext.location;

            return this.runWithContext(req, next);
        } catch (error) {
            next(error);
        }
    };

    // Helper to run the logger context (since req.user/req.tenant are now resolved)
    private runWithContext = (req: Request, next: NextFunction) => {
        const requestId = (req.headers["x-request-id"] as string) || uuidv7();

        const context = {
            requestId,
            tenantId: req.tenant?.id,
            location: req.location,
            user: req.user,
        };

        requestContext.run(context, () => {
            next();
        });
    };
}

export default new AuthMiddleware();
