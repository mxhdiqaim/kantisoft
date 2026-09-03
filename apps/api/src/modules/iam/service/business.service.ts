import { eq } from "drizzle-orm";
import { BaseService } from "../../../shared/service";
import { db } from "../../../shared/database";
import { InsertBusinessSchemaT, InsertUserSchemaT, businessSchema, userSchema } from "../schema";
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

            // Make the user role to OWNER AND attach them to the businessId
            const [updatedOwner] = await tx
                .update(userSchema)
                .set({
                    role: UserRoleEnum.OWNER,
                    businessId: newBusiness.id,
                })
                .where(eq(userSchema.id, user.id))
                .returning();

            return {
                business: newBusiness,
                owner: updatedOwner,
            };
        });
    }

    // Changed userId to take the full user object so we can check user.businessId natively
    public async getSingleBusiness(businessId: string, user: InsertUserSchemaT) {
        const business = await this.getByIdOrError(businessId);

        //  Check if the requesting user is the direct owner
        if (business.userId === user.id) {
            return business;
        }

        // Check if this user's assigned businessId matches the requested business
        if (user.businessId === businessId) {
            return business;
        }

        // If neither owner nor staff, deny access
        throw new ForbiddenError("Access denied. You do not have permission to view this business's details.");
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
