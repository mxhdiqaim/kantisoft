import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { requestContext } from "../logger/context";
import { UserRoleEnum } from "../../modules/iam/interface";
import { UnauthorizedError, ForbiddenError } from "../errors/custom.error";
import { v4 as uuidv7 } from "uuid";

class AuthMiddleware {
    public requireAuth = (req: Request, res: Response, next: NextFunction): void => {
        try {
            const auth = getAuth(req);

            if (!auth.isAuthenticated || !auth.userId) {
                throw new UnauthorizedError("Authentication failed or missing.");
            }

            // eslint-disable-next-line
            const metadata: any = auth.sessionClaims?.metadata || {};

            const contextData = {
                requestId: (req.headers["x-request-id"] as string) || uuidv7(),
                clerkId: auth.userId,
                userId: metadata.userId || null,
                role: (metadata.role as UserRoleEnum) || null,
                businessId: metadata.businessId || null,
                branchId: metadata.branchId || null,
            };

            requestContext.run(contextData, () => {
                next();
            });
        } catch (error) {
            next(error);
        }
    };

    public validateAccess = (req: Request, res: Response, next: NextFunction): void => {
        try {
            const context = requestContext.getStore();

            if (!context) {
                throw new UnauthorizedError("Security context missing. Ensure requireAuth runs first.");
            }

            // Move the strict syncing check here! This protects the rest of the app.
            if (!context.userId) {
                throw new UnauthorizedError("User profile syncing. Please wait a moment.");
            }

            // Everyone hitting a protected route MUST have a business assigned to them.
            if (!context.businessId) {
                throw new ForbiddenError("You must create or join a business to access this resource.");
            }

            // If the user is STAFF, they MUST have a branch assigned to them to do anything.
            if (context.role !== UserRoleEnum.OWNER && !context.branchId) {
                throw new ForbiddenError("You must be assigned to a branch to access this resource.");
            }

            return next();
        } catch (error) {
            next(error);
        }
    };

    // public isAuthorized = (req: Request, res: Response, next: NextFunction, allowedRoles: UserRoleEnum[]) => {
    //     const auth = getAuth(req);
    //
    //     if (!auth.isAuthenticated || !auth.userId) {
    //         throw new UnauthorizedError("Authentication failed or missing.");
    //     }
    //
    //     // eslint-disable-next-line
    //     const metadata: any = auth.sessionClaims?.metadata || {};
    //
    //     if (!metadata.userId) {
    //         throw new UnauthorizedError("User profile syncing. Please wait a moment.");
    //     }
    //
    //     const userRole = metadata.role;
    //
    //     if (userRole && allowedRoles.includes(userRole as UserRoleEnum)) {
    //         return next();
    //     }
    // };
}

export default new AuthMiddleware();
