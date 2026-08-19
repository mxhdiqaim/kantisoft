import { eq } from "drizzle-orm";
import { BaseService } from "../../../shared/service";
import { db } from "../../../shared/database";
import { locationSchema, tenantSchema, userSchema } from "../schema";
import { ConflictError, NotFoundError } from "../../../shared/errors/custom.error";
import { UserRoleEnum, OnboardBusinessDTO } from "../interface";

export class TenantService extends BaseService<typeof tenantSchema> {
    constructor() {
        super(tenantSchema);
    }

    public async getTenantDetails(tenantId: string) {
        return this.getByIdOrError(tenantId, "Business not found.");
    }

    public async renameTenant(tenantId: string, newName: string) {
        return this.updateByQuery(eq(tenantSchema.id, tenantId), { name: newName });
    }

    public async onboardNewBusiness(data: OnboardBusinessDTO) {
        const { businessName, clerkUserId, countryId, slug } = data;

        const [user] = await db.select().from(userSchema).where(eq(userSchema.clerkId, clerkUserId)).limit(1);

        if (!user) {
            throw new NotFoundError("User profile not found. Please try logging in again.");
        }

        const [existingTenant] = await db
            .select({ id: tenantSchema.id })
            .from(tenantSchema)
            .where(eq(tenantSchema.userId, user.id))
            .limit(1);

        if (existingTenant) {
            throw new ConflictError("You already own a business account.");
        }

        // Auto-generate a slug if one isn't provided
        const tenantSlug =
            slug ||
            businessName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)+/g, "");

        // Execute atomic transaction
        return await db.transaction(async (tx) => {
            const [newTenant] = await tx
                .insert(tenantSchema)
                .values({
                    userId: user.id,
                    name: businessName,
                    slug: tenantSlug,
                    countryId: countryId,
                })
                .returning();

            // Create a default Location for the new business
            const [defaultLocation] = await tx
                .insert(locationSchema)
                .values({
                    tenantId: newTenant.id,
                    name: "Main Location",
                })
                .returning();

            // Elevate the user's role to OWNER
            const [updatedOwner] = await tx
                .update(userSchema)
                .set({ role: UserRoleEnum.OWNER })
                .where(eq(userSchema.id, user.id))
                .returning();

            return {
                tenant: newTenant,
                location: defaultLocation,
                owner: updatedOwner,
            };
        });
    }
}

export default new TenantService();
