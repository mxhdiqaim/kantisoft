import { Request, Response, NextFunction } from "express";
import { eq, and } from "drizzle-orm";
import { BadRequestError, ForbiddenError, UnauthorizedError } from "../errors/custom.error";
import { db } from "../database";
import { tenantSchema } from "../../modules";

class TenantMiddleware {
    public validateTenantOwnership = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { user } = req;

            if (!user) {
                throw new UnauthorizedError("User not found or not authorised.");
            }

            const tenantId = req.params.id || (req.headers["x-tenant-id"] as string);

            if (!tenantId) {
                throw new BadRequestError("The provided ID is not valid.");
            }

            // Validate strict owner access
            const [tenant] = await db
                .select()
                .from(tenantSchema)
                .where(and(eq(tenantSchema.id, String(tenantId)), eq(tenantSchema.userId, user.id)))
                .limit(1);

            if (!tenant) {
                throw new ForbiddenError("You do not have permission to access or modify this business.");
            }

            // Attach tenant to the request for the controller to use
            req.tenant = tenant;
            return next();
        } catch (error) {
            next(error);
        }
    };
}

export default new TenantMiddleware();
