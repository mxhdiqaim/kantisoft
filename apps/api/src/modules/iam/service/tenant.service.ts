import { eq } from "drizzle-orm";
import { BaseService } from "../../../shared/service";
import { db } from "../../../shared/database";
import { tenantSchema, userSchema } from "../schema";

class TenantService extends BaseService<typeof tenantSchema> {
    constructor() {
        super(tenantSchema);
    }

    public async getTenantDetails(tenantId: string) {
        return this.getByIdOrError(tenantId, "Business not found.");
    }

    public async renameTenant(tenantId: string, newName: string) {
        return this.updateByQuery(eq(tenantSchema.id, tenantId), { name: newName });
    }

    /**
     * ONBOARDIGN STEP 2
     * The owner already exists from the webhook, but their tenantId is null.
     * We create the business and update their user record to link them.
     */
    public async onboardNewBusiness(businessName: string, clerkUserId: string) {
        return await db.transaction(async (tx) => {
            // Create the new Tenant
            const [newTenant] = await tx.insert(tenantSchema).values({ name: businessName }).returning();

            // Update the existing Owner to link them to this Tenant
            const [updatedOwner] = await tx
                .update(userSchema)
                .set({ tenantId: newTenant.id })
                .where(eq(userSchema.clerkId, clerkUserId))
                .returning();

            if (!updatedOwner) {
                // Failsafe in case the webhook was delayed or failed
                throw new Error("Owner profile not found. Please try again.");
            }

            return { tenant: newTenant, owner: updatedOwner };
        });
    }
}

export default new TenantService();
