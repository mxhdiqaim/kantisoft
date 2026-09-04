import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { requestContext } from "../logger/context";
import { UnauthorizedError, ForbiddenError, BadRequestError } from "../errors/custom.error";
import { v4 as uuidv7 } from "uuid";
import { helperUtil } from "../utils";
import { EnvironmentVariablesEnum } from "../interface";
import { UserRoleEnum } from "../../modules/iam/interface";

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

            // DEV-MODE
            if (
                this.NODE_ENV === EnvironmentVariablesEnum.DEVELOPMENT &&
                authHeader === `Bearer ${this.DEVELOPMENT_TOKEN}`
            ) {
                // Mock the Clerk public_metadata for dev ENV
                metadata = {
                    userId: this.DEV_USER_ID,
                    role: this.DEV_ROLE || UserRoleEnum.OWNER,
                    businessId: this.DEV_BUSINESS_ID,
                    branchId: this.DEV_BRANCH_ID,
                };
            } else {
                // PRODUCTION CLERK FLOW
                const auth = getAuth(req);
                if (!auth.isAuthenticated || !auth.userId) {
                    throw new UnauthorizedError("Authentication failed or missing.");
                }

                metadata = auth.sessionClaims?.metadata || {};
            }

            if (!metadata.userId) {
                throw new UnauthorizedError("User profile syncing. Please wait a moment.");
            }

            // Initialising the context
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

            const requestedBusinessId = req.headers["x-business-id"] as string;
            const requestedBranchId = req.headers["x-branch-id"] as string;

            if (!requestedBusinessId) {
                throw new BadRequestError("No business selected.");
            }

            // OWNER ACCESS VALIDATION
            if (context.role === UserRoleEnum.OWNER) {
                if (context.businessId !== requestedBusinessId) {
                    throw new ForbiddenError("You do not have permission to access this business.");
                }
                return next();
            }

            // STAFF ACCESS VALIDATION
            if (!requestedBranchId) {
                throw new BadRequestError("No branch selected for staff access.");
            }

            if (context.businessId !== requestedBusinessId || context.branchId !== requestedBranchId) {
                throw new ForbiddenError("You do not have access to this branch or business.");
            }

            return next();
        } catch (error) {
            next(error);
        }
    };
}

export default new AuthMiddleware();
