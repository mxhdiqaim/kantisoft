import { and, eq } from "drizzle-orm";
import { addressService, BaseService } from "../../../shared/service";
import { db } from "../../../shared/database";
import { branchSchema, InsertBranchSchemaT, userSchema, businessSchema } from "../schema";
import { UserRoleEnum } from "../interface";
import { ForbiddenError } from "../../../shared/errors/custom.error";
import { CreateBranchDTO } from "../interface";
import { addressSchema } from "../../../shared/database/schema";
import { userService, businessService } from "./index";

class BranchService extends BaseService<typeof branchSchema> {
    constructor() {
        super(branchSchema, "Branch");
    }

    public async create(userId: string, data: CreateBranchDTO) {
        const { addressId, name } = data;

        const user = await userService.getOrError(eq(userSchema.id, userId));

        if (user.role !== UserRoleEnum.OWNER || !user.businessId) {
            throw new ForbiddenError("Only business owners with an active business can create branches.");
        }

        await businessService.getOrError(
            and(eq(businessSchema.id, user.businessId), eq(businessSchema.userId, userId)),
        );

        // Only validate address if one was actually provided!
        if (addressId) {
            await addressService.getByIdOrError(addressId);
        }

        const [newBranch] = await db
            .insert(branchSchema)
            .values({
                addressId,
                name,
                businessId: user.businessId,
            })
            .returning();

        return newBranch;
    }

    public async update(branchId: string, userId: string, data: Partial<CreateBranchDTO>) {
        const { addressId, name } = data;

        const user = await userService.getOrError(eq(userSchema.id, userId));

        if (user.role !== UserRoleEnum.OWNER || !user.businessId) {
            throw new ForbiddenError("Only business owners with an active business can update branches.");
        }

        const branch = await this.getByIdOrError(branchId);

        if (branch.businessId !== user.businessId) {
            throw new ForbiddenError("You do not have permission to update this branch.");
        }

        await businessService.getOrError(
            and(eq(businessSchema.id, branch.businessId), eq(businessSchema.userId, userId)),
        );

        const updateData: Partial<InsertBranchSchemaT> = {};

        // Only validate address if the user is actively trying to update it
        if (addressId !== undefined) {
            if (addressId !== null) {
                await addressService.getOrError(eq(addressSchema.id, addressId));
            }
            updateData.addressId = addressId;
        }

        if (name !== undefined) {
            updateData.name = name;
        }

        return this.updateByQuery(eq(branchSchema.id, branchId), updateData);
    }
}

export default new BranchService();
