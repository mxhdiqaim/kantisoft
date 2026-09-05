import { and, eq } from "drizzle-orm";
import { addressService, BaseService, countryService } from "../../../shared/service";
import { db } from "../../../shared/database";
import { businessSchema, InsertBusinessSchemaT, userSchema } from "../schema";
import { ConflictError, NotFoundError } from "../../../shared/errors/custom.error";
import { OnboardBusinessDTO, UserRoleEnum } from "../interface";
import { helperUtil } from "../../../shared/utils";
import { createClerkClient } from "@clerk/express";
import logger from "../../../shared/logger";

export class BusinessService extends BaseService<typeof businessSchema> {
    constructor() {
        super(businessSchema, "Business");
    }

    private readonly CLERK_SECRET_KEY = helperUtil.getEnvVariable("CLERK_SECRET_KEY");

    private clerkClient = createClerkClient({
        secretKey: this.CLERK_SECRET_KEY,
    });

    public async onboardNewBusiness(userId: string, data: OnboardBusinessDTO) {
        const {
            businessName,
            countryId,
            description,
            logoUrl,
            addressId,
            companyRegistrationNumber,
            teamSize,
            taxOrVatId,
        } = data;

        const [user] = await db.select().from(userSchema).where(eq(userSchema.id, userId)).limit(1);

        if (!user) {
            throw new NotFoundError("User profile not found. Please try logging in again.");
        }

        if (user.businessId) {
            throw new ConflictError("You are already associated with a business account.");
        }

        const slug = helperUtil.getSlug(businessName);

        const result = await db.transaction(async (tx) => {
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

        try {
            await this.clerkClient.users.updateUserMetadata(user.clerkId, {
                publicMetadata: {
                    userId: result.owner.id,
                    role: UserRoleEnum.OWNER,
                    businessId: result.business.id,
                },
            });
        } catch (error) {
            logger.warn(`Failed to sync metadata to Clerk for ${user.clerkId}. (Expected in Dev Mode)`, error as never);
        }

        return result;
    }

    public async update(businessId: string, userId: string, data: Partial<OnboardBusinessDTO>) {
        const { countryId, addressId } = data;

        await this.getOrError(and(eq(businessSchema.id, String(businessId)), eq(businessSchema.userId, userId)));

        if (countryId) {
            await countryService.getByIdOrError(countryId);
        }

        if (addressId) {
            await addressService.getByIdOrError(addressId);
        }

        const updatePayload: Partial<InsertBusinessSchemaT> = {};

        if (data.businessName !== undefined) {
            updatePayload.businessName = data.businessName;
            updatePayload.slug = helperUtil.getSlug(updatePayload.businessName);
        }

        if (data.logoUrl !== undefined) {
            updatePayload.logoUrl = data.logoUrl;
        }

        if (data.companyRegistrationNumber !== undefined) {
            updatePayload.companyRegistrationNumber = data.companyRegistrationNumber;
        }

        if (data.teamSize !== undefined) {
            updatePayload.teamSize = data.teamSize;
        }

        if (data.taxOrVatId !== undefined) {
            updatePayload.taxOrVatId = data.taxOrVatId;
        }

        if (data.description !== undefined) {
            updatePayload.description = data.description;
        }

        const [updatedBusiness] = await this.updateByQuery(eq(businessSchema.id, businessId), updatePayload);

        return updatedBusiness;
    }
}

export default new BusinessService();
