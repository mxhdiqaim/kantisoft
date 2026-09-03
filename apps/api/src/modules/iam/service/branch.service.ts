import { eq } from "drizzle-orm";
import { BaseService } from "../../../shared/service";
import { db } from "../../../shared/database";
import { InsertBranchSchemaT, branchSchema, userSchema } from "../schema";
import { UserRoleEnum } from "../interface";
import { ForbiddenError, NotFoundError } from "../../../shared/errors/custom.error";

class BranchService extends BaseService<typeof branchSchema> {
    constructor() {
        super(branchSchema, "Branch");
    }

    public async create(userId: string, data: Omit<InsertBranchSchemaT, "businessId">) {
        // Query userSchema directly (since 'this' points to the branches table, not users)
        const [user] = await db.select().from(userSchema).where(eq(userSchema.id, userId)).limit(1);

        if (!user) {
            throw new NotFoundError("User profile not found.");
        }

        // Must be an OWNER AND have an active businessId assigned
        if (user.role !== UserRoleEnum.OWNER || !user.businessId) {
            throw new ForbiddenError("Only business owners with an active business can create branches.");
        }

        const [newBranch] = await db
            .insert(branchSchema)
            .values({
                ...data,
                businessId: user.businessId,
            })
            .returning();

        return newBranch;
    }

    public async update(
        branchId: string,
        userId: string,
        updateData: Partial<Omit<InsertBranchSchemaT, "id" | "businessId">>,
    ) {
        const [user] = await db.select().from(userSchema).where(eq(userSchema.id, userId)).limit(1);

        if (!user) {
            throw new NotFoundError("User profile not found.");
        }

        // Must be an OWNER AND have an active businessId assigned
        if (user.role !== UserRoleEnum.OWNER || !user.businessId) {
            throw new ForbiddenError("Only business owners with an active business can update branches.");
        }

        return this.updateByQuery(eq(branchSchema.id, branchId), updateData);
    }
}

export default new BranchService();
