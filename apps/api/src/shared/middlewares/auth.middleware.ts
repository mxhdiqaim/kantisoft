import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { requestContext } from "../logger/context";
import { UserRoleEnum } from "../../modules/iam/interface";
import { UnauthorizedError, ForbiddenError } from "../errors/custom.error";
import { v4 as uuidv7 } from "uuid";
import { helperUtil } from "../utils";
import { EnvironmentVariablesEnum } from "../interface";

class AuthMiddleware {
    private readonly NODE_ENV = helperUtil.getEnvVariable("NODE_ENV");
    private readonly DEVELOPMENT_TOKEN = helperUtil.getEnvVariable("DEVELOPMENT_TOKEN");
    private readonly DEV_USER_ID = helperUtil.getEnvVariable("DEV_USER_ID");
    private readonly DEV_ROLE = helperUtil.getEnvVariable("DEV_ROLE");
    private readonly DEV_BUSINESS_ID = helperUtil.getEnvVariable("DEV_BUSINESS_ID");
    private readonly DEV_BRANCH_ID = helperUtil.getEnvVariable("DEV_BRANCH_ID");

    public requireAuth = (req: Request, res: Response, next: NextFunction): void => {
        try {
            const authHeader = req.headers.authorization;
            // eslint-disable-next-line
            let metadata: any = {};

            if (
                this.NODE_ENV === EnvironmentVariablesEnum.DEVELOPMENT &&
                authHeader === `Bearer ${this.DEVELOPMENT_TOKEN}`
            ) {
                const cleanBusinessId =
                    this.DEV_BUSINESS_ID === EnvironmentVariablesEnum.DEVELOPMENT || !this.DEV_BUSINESS_ID
                        ? undefined
                        : this.DEV_BUSINESS_ID;
                const cleanBranchId =
                    this.DEV_BRANCH_ID === EnvironmentVariablesEnum.DEVELOPMENT || !this.DEV_BRANCH_ID
                        ? undefined
                        : this.DEV_BRANCH_ID;

                metadata = {
                    userId: this.DEV_USER_ID,
                    role: this.DEV_ROLE || UserRoleEnum.OWNER,
                    businessId: cleanBusinessId,
                    branchId: cleanBranchId,
                };
            } else {
                const auth = getAuth(req);
                if (!auth.isAuthenticated || !auth.userId) {
                    throw new UnauthorizedError("Authentication failed or missing.");
                }
                metadata = auth.sessionClaims?.metadata || {};
            }

            if (!metadata.userId) {
                throw new UnauthorizedError("User profile syncing. Please wait a moment.");
            }

            const contextData = {
                requestId: (req.headers["x-request-id"] as string) || uuidv7(),
                userId: metadata.userId,
                role: metadata.role as UserRoleEnum,
                businessId: metadata.businessId,
                branchId: metadata.branchId,
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
}

export default new AuthMiddleware();
