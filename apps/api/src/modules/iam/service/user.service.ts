import { eq } from "drizzle-orm";
import { BaseService } from "../../../shared/service";
import { db } from "../../../shared/database";
import { InviteUserDto, SyncClerkUserDTO, UserRoleEnum, UserStatusEnum } from "../interface";
import { userSchema } from "../schema";
import logger from "../../../shared/logger";

class UserService extends BaseService<typeof userSchema> {
    constructor() {
        super(userSchema, "User");
    }

    public async inviteUser(userData: InviteUserDto & { businessId: string; branchId: string }) {
        return await db.transaction(async (tx) => {
            const { branchId, businessId, ...userInsertData } = userData;

            // Insert the pending user directly with their assigned branch and business
            const [newUser] = await tx
                .insert(userSchema)
                .values({
                    ...userInsertData,
                    businessId,
                    branchId,
                    status: UserStatusEnum.INVITED,
                    clerkId: `pending-${crypto.randomUUID()}`,
                })
                .returning();

            return newUser;
        });
    }

    public async assignBranchToUser(userId: string, branchId: string) {
        // Verify the user exists first
        await this.getByIdOrError(userId);

        // Update the user's branchId directly
        const [updatedUser] = await db
            .update(userSchema)
            .set({ branchId })
            .where(eq(userSchema.id, userId))
            .returning();

        return updatedUser;
    }

    public async syncClerkUserCreated(data: SyncClerkUserDTO) {
        const { clerkId, email, firstName, lastName, phoneNumber, avatarUrl, role } = data;

        // Idempotency check: don't recreate if user already exists
        const [existingUser] = await db
            .select({ id: userSchema.id })
            .from(userSchema)
            .where(eq(userSchema.clerkId, clerkId))
            .limit(1);

        if (existingUser) {
            logger.warn(`User with clerkId ${clerkId} already exists in local DB. Skipping creation.`);
            return existingUser;
        }

        // Default self-signup users to OWNER unless explicitly specified otherwise (e.g. invited staff)
        const userRole = role || UserRoleEnum.OWNER;

        const [newUser] = await db
            .insert(userSchema)
            .values({
                clerkId,
                email,
                firstName,
                lastName,
                phoneNumber: phoneNumber || null,
                avatarUrl: avatarUrl || null,
                role: userRole,
            })
            .onConflictDoNothing({ target: userSchema.clerkId })
            .returning();

        return newUser;
    }

    public async syncClerkUserUpdated(data: SyncClerkUserDTO) {
        const { clerkId, email, firstName, lastName, phoneNumber, avatarUrl } = data;

        const [updatedUser] = await db
            .update(userSchema)
            .set({
                email,
                firstName,
                lastName,
                phoneNumber: phoneNumber || null,
                avatarUrl: avatarUrl || null,
            })
            .where(eq(userSchema.clerkId, clerkId))
            .returning();

        return updatedUser;
    }

    public async syncClerkUserDeleted(clerkId: string) {
        return await db.delete(userSchema).where(eq(userSchema.clerkId, clerkId));
    }
}

export default new UserService();
