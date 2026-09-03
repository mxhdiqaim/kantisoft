import { and, eq } from "drizzle-orm";
import { BaseService } from "../../../shared/service";
import { db } from "../../../shared/database";
import {
    InsertBusinessSchemaT,
    InsertUserSchemaT,
    locationSchema,
    businessSchema,
    userLocationsSchema,
    userSchema,
} from "../schema";
import { ConflictError, ForbiddenError, NotFoundError } from "../../../shared/errors/custom.error";
import { OnboardBusinessDTO, UserRoleEnum } from "../interface";
import { helperUtil } from "../../../shared/utils";

export class TenantService extends BaseService<typeof businessSchema> {
    constructor() {
        super(businessSchema, "Business");
    }

    public async onboardNewBusiness(data: OnboardBusinessDTO) {
        const {
            tenantName,
            clerkUserId,
            countryId,
            description,
            logoUrl,
            addressId,
            companyRegistrationNumber,
            teamSize,
            taxOrVatId,
        } = data;

        const [user] = await db.select().from(userSchema).where(eq(userSchema.clerkId, clerkUserId)).limit(1);

        if (!user) {
            throw new NotFoundError("User profile not found. Please try logging in again.");
        }

        const [existingTenant] = await db
            .select({ id: businessSchema.id })
            .from(businessSchema)
            .where(eq(businessSchema.userId, user.id))
            .limit(1);

        if (existingTenant) {
            throw new ConflictError("You already own a business account.");
        }

        // Auto-generate a slug if one isn't provided
        const slug = helperUtil.getSlug(tenantName);

        // Execute atomic transaction
        return await db.transaction(async (tx) => {
            const [newTenant] = await tx
                .insert(businessSchema)
                .values({
                    userId: user.id,
                    tenantName,
                    slug,
                    countryId: countryId,
                    description,
                    addressId,
                    logoUrl,
                    companyRegistrationNumber,
                    teamSize,
                    taxOrVatId,
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

    public async getSingleTenant(tenantId: string, userId: string) {
        const tenant = await this.getByIdOrError(tenantId);

        // Check if the requesting user is the owner
        if (tenant.userId === userId) {
            return tenant;
        }

        // Verify if the user is assigned to any location belonging to this tenant
        const [assignedLocation] = await db
            .select({ locationId: userLocationsSchema.locationId })
            .from(userLocationsSchema)
            .innerJoin(locationSchema, eq(userLocationsSchema.locationId, locationSchema.id))
            .where(and(eq(locationSchema.tenantId, tenantId), eq(userLocationsSchema.userId, userId)))
            .limit(1);

        // If neither owner nor staff, deny access
        if (!assignedLocation) {
            throw new ForbiddenError("Access denied. You do not have permission to view this business's details.");
        }

        return tenant;
    }

    public async update(tenantId: string, updateData: Partial<InsertBusinessSchemaT>, user: InsertUserSchemaT) {
        const existingTenant = await this.getByIdOrError(tenantId);

        if (existingTenant.userId !== user.id) {
            throw new ForbiddenError("Access denied. You can only modify a business that you own.");
        }

        const payload = { ...updateData };

        if (payload.tenantName) {
            payload.slug = helperUtil.getSlug(payload.tenantName);
        }

        return await this.updateByQuery(eq(businessSchema.id, tenantId), payload);
    }
}

export default new TenantService();
