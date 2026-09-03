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

export class BusinessService extends BaseService<typeof businessSchema> {
    constructor() {
        super(businessSchema, "Business");
    }

    public async onboardNewBusiness(data: OnboardBusinessDTO) {
        const {
            businessName,
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

        const [existingBusiness] = await db
            .select({ id: businessSchema.id })
            .from(businessSchema)
            .where(eq(businessSchema.userId, user.id))
            .limit(1);

        if (existingBusiness) {
            throw new ConflictError("You already own a business account.");
        }

        // Auto-generate a slug if one isn't provided
        const slug = helperUtil.getSlug(businessName);

        // Execute atomic transaction
        return await db.transaction(async (tx) => {
            const [newBusiness] = await tx
                .insert(businessSchema)
                .values({
                    userId: user.id,
                    businessName,
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
                    businessId: newBusiness.id,
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
                business: newBusiness,
                location: defaultLocation,
                owner: updatedOwner,
            };
        });
    }

    public async getSingleSingle(businessId: string, userId: string) {
        const business = await this.getByIdOrError(businessId);

        // Check if the requesting user is the owner
        if (business.userId === userId) {
            return business;
        }

        // Verify if the user is assigned to any location belonging to this business
        const [assignedLocation] = await db
            .select({ locationId: userLocationsSchema.locationId })
            .from(userLocationsSchema)
            .innerJoin(locationSchema, eq(userLocationsSchema.locationId, locationSchema.id))
            .where(and(eq(locationSchema.businessId, businessId), eq(userLocationsSchema.userId, userId)))
            .limit(1);

        // If neither owner nor staff, deny access
        if (!assignedLocation) {
            throw new ForbiddenError("Access denied. You do not have permission to view this business's details.");
        }

        return business;
    }

    public async update(businessId: string, updateData: Partial<InsertBusinessSchemaT>, user: InsertUserSchemaT) {
        const existingBusiness = await this.getByIdOrError(businessId);

        if (existingBusiness.userId !== user.id) {
            throw new ForbiddenError("Access denied. You can only modify a business that you own.");
        }

        const payload = { ...updateData };

        if (payload.businessName) {
            payload.slug = helperUtil.getSlug(payload.businessName);
        }

        return await this.updateByQuery(eq(businessSchema.id, businessId), payload);
    }
}

export default new BusinessService();
