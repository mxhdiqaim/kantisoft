import { Request, Response, NextFunction } from "express";
import { BadRequestError, ForbiddenError, UnauthorizedError } from "../errors/custom.error";
import { tenantSchema, tenantService } from "../../modules";
import { and, eq } from "drizzle-orm";

class TenantMiddleware {
    public validateTenantOwnership = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { user } = req;

            if (!user) {
                throw new UnauthorizedError("User not found or not authorised.");
            }

            const tenantId = (req.headers["x-tenant-id"] as string)?.split(",")[0]?.trim();

            if (!tenantId) {
                throw new BadRequestError("No tenant selected.");
            }

            const tenant = await tenantService.getOrError(
                and(eq(tenantSchema.id, tenantId), eq(tenantSchema.userId, user!.id)),
            );

            if (!tenant) {
                throw new ForbiddenError("You do not have access to this resource.");
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
