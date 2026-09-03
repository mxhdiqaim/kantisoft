import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { eq, and } from "drizzle-orm";
import { db } from "../database";
import { requestContext } from "../logger/context";
import { UserRoleEnum } from "../../modules/iam/interface";
import { UnauthorizedError, ForbiddenError, BadRequestError } from "../errors/custom.error";
import { branchSchema, businessSchema, userSchema } from "../../modules";
import { v4 as uuidv7 } from "uuid";
import { helperUtil } from "../utils";
import { EnvironmentVariablesEnum } from "../interface";

class AuthMiddleware {
    private readonly NODE_ENV = helperUtil.getEnvVariable("NODE_ENV");
    private readonly CLERK_USER_ID = helperUtil.getEnvVariable("CLERK_USER_ID");
    private readonly DEVELOPMENT_TOKEN = helperUtil.getEnvVariable("DEVELOPMENT_TOKEN");

    public requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const authHeader = req.headers.authorization;
            let clerkId: string | null = null;

            if (
                this.NODE_ENV === EnvironmentVariablesEnum.DEVELOPMENT &&
                authHeader === `Bearer ${this.DEVELOPMENT_TOKEN}`
            ) {
                clerkId = this.CLERK_USER_ID;
            } else {
                const auth = getAuth(req);
                if (!auth.isAuthenticated || !auth.userId) {
                    throw new UnauthorizedError("Authentication failed or missing.");
                }
                clerkId = auth.userId;
            }

            const [user] = await db.select().from(userSchema).where(eq(userSchema.clerkId, clerkId)).limit(1);

            if (!user) {
                throw new UnauthorizedError("User profile syncing. Please wait a moment.");
            }

            req.user = user;
            return next();
        } catch (error) {
            next(error);
        }
    };

    public validateAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = req.user;

            if (!user) {
                throw new UnauthorizedError("User not found on request. Ensure requireAuth runs first.");
            }

            const businessId = req.headers["x-business-id"] as string;
            const branchId = req.headers["x-branch-id"] as string;

            if (!businessId) {
                throw new BadRequestError("No business selected.");
            }

            // --- OWNER ACCESS VALIDATION ---
            if (user.role === UserRoleEnum.OWNER) {
                const [business] = await db
                    .select()
                    .from(businessSchema)
                    .where(and(eq(businessSchema.id, businessId), eq(businessSchema.userId, user.id)))
                    .limit(1);

                if (business) {
                    req.business = business;

                    if (branchId) {
                        const [branch] = await db
                            .select()
                            .from(branchSchema)
                            .where(and(eq(branchSchema.id, branchId), eq(branchSchema.businessId, businessId)))
                            .limit(1);

                        if (!branch) {
                            throw new ForbiddenError(
                                "The requested branch does not exist in your business or you don't have permission.",
                            );
                        }
                        req.branch = branch;
                    }

                    return this.runWithContext(req, next);
                }
            }

            // STAFF ACCESS VALIDATION
            if (!branchId) {
                throw new BadRequestError("No branch selected for staff access.");
            }

            // Does this user actually belong to the branch they are passing?
            if (user.branchId !== branchId) {
                throw new ForbiddenError("You do not have access to this branch.");
            }

            // Fetch the branch and business to attach to the request, ensuring the hierarchy matches
            const [staffContext] = await db
                .select({
                    branch: branchSchema,
                    business: businessSchema,
                })
                .from(branchSchema)
                .innerJoin(businessSchema, eq(branchSchema.businessId, businessSchema.id))
                .where(and(eq(branchSchema.id, branchId), eq(businessSchema.id, businessId)))
                .limit(1);

            if (!staffContext) {
                throw new ForbiddenError("The requested branch does not belong to this business.");
            }

            req.business = staffContext.business;
            req.branch = staffContext.branch;

            return this.runWithContext(req, next);
        } catch (error) {
            next(error);
        }
    };

    private runWithContext = (req: Request, next: NextFunction) => {
        const requestId = (req.headers["x-request-id"] as string) || uuidv7();

        const context = {
            requestId,
            businessId: req.business?.id,
            branchId: req.branch?.id,
            user: req.user,
        };

        requestContext.run(context, () => {
            next();
        });
    };
}

export default new AuthMiddleware();
