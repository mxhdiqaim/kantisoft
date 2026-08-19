import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { v4 as uuidv4 } from "uuid";
import { eq, and } from "drizzle-orm";
import { db } from "../database";
import { requestContext } from "../logger/context";
import { UserRoleEnum } from "../../modules/iam/interface";
import { UnauthorizedError, ForbiddenError, BadRequestError } from "../errors/custom.error";
import { locationSchema, tenantSchema, userLocationsSchema, userSchema } from "../../modules";

class AuthMiddleware {
    public requireAuth(req: Request, res: Response, next: NextFunction) {
        const { isAuthenticated } = getAuth(req);

        if (!isAuthenticated) {
            return next(new UnauthorizedError("Authentication failed or missing."));
        }

        next();
    }

    public async withTenantContext(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId: clerkId } = getAuth(req);

            if (!clerkId) {
                return next(new UnauthorizedError("Authentication failed or missing."));
            }

            const [user] = await db
                .select({
                    id: userSchema.id,
                    role: userSchema.role,
                })
                .from(userSchema)
                .where(eq(userSchema.clerkId, clerkId))
                .limit(1);

            if (!user) {
                return next(new UnauthorizedError("User profile syncing. Please wait a moment."));
            }

            let resolvedTenantId: string | null = null;
            const targetLocationId = (req.headers["x-location-id"] as string) || undefined;

            // Resolve Tenant based on Role Strategy
            if (user.role === UserRoleEnum.OWNER) {
                // OWNER PATH: Find the tenant they own directly
                const [ownedTenant] = await db
                    .select({ id: tenantSchema.id })
                    .from(tenantSchema)
                    .where(eq(tenantSchema.userId, user.id))
                    .limit(1);

                if (!ownedTenant) {
                    return next(
                        new ForbiddenError("You must create a business profile before accessing this resource."),
                    );
                }

                resolvedTenantId = ownedTenant.id;

                // If owner targets a specific location, optionally verify it belongs to their tenant
                if (targetLocationId) {
                    const [locationExists] = await db
                        .select({ id: locationSchema.id })
                        .from(locationSchema)
                        .where(
                            and(eq(locationSchema.id, targetLocationId), eq(locationSchema.tenantId, resolvedTenantId)),
                        )
                        .limit(1);

                    if (!locationExists) {
                        return next(new ForbiddenError("The requested location does not belong to your business."));
                    }
                }
            } else {
                // STAFF PATH: They MUST provide a target location to establish tenant context
                if (!targetLocationId) {
                    return next(new BadRequestError("Missing required header: x-location-id for staff access."));
                }

                // Verify assignment AND resolve the tenantId in one join query
                const [staffContext] = await db
                    .select({
                        locationId: userLocationsSchema.locationId,
                        tenantId: locationSchema.tenantId,
                    })
                    .from(userLocationsSchema)
                    .innerJoin(locationSchema, eq(userLocationsSchema.locationId, locationSchema.id))
                    .where(
                        and(
                            eq(userLocationsSchema.userId, user.id),
                            eq(userLocationsSchema.locationId, targetLocationId),
                        ),
                    )
                    .limit(1);

                if (!staffContext) {
                    return next(
                        new ForbiddenError("You do not have permission to access this location or it does not exist."),
                    );
                }

                resolvedTenantId = staffContext.tenantId;
            }

            // Trace & Context binding
            const requestId = (req.headers["x-request-id"] as string) || uuidv4();

            const context = {
                requestId,
                tenantId: resolvedTenantId,
                locationId: targetLocationId, // Could be undefined for Owners viewing global dashboard
                role: user.role,
            };

            requestContext.run(context, () => {
                next();
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new AuthMiddleware();
