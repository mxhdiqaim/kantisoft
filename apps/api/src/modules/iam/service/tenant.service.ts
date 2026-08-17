import { eq } from "drizzle-orm";
import { BaseService } from "../../../shared/service";
import { InsertUserSchemaT, tenantSchema, userSchema } from "../iam.schema";
import { db } from "../../../shared/database";
import { UserRoleEnum, UserStatusEnum } from "../interface";

class TenantService extends BaseService<typeof tenantSchema> {
    constructor() {
        super(tenantSchema);
    }

    public async onboardNewBusiness(
        businessName: string,
        ownerData: Omit<InsertUserSchemaT, "tenantId" | "role" | "status">,
    ) {
        return await db.transaction(async (tx) => {
            const [newTenant] = await tx.insert(tenantSchema).values({ name: businessName }).returning();

            const [newOwner] = await tx
                .insert(userSchema)
                .values({
                    ...ownerData,
                    tenantId: newTenant.id,
                    role: UserRoleEnum.OWNER,
                    status: UserStatusEnum.ACTIVE,
                })
                .returning();

            return { tenant: newTenant, owner: newOwner };
        });
    }

    public async getTenantDetails(tenantId: string) {
        return this.getByIdOrError(tenantId, "Business not found.");
    }

    public async renameTenant(tenantId: string, newName: string) {
        return this.updateByQuery(eq(tenantSchema.id, tenantId), { name: newName });
    }
}

export default new TenantService();
