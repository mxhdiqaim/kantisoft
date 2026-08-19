import { eq } from "drizzle-orm";
import { BaseService } from "../../../shared/service";
import { db } from "../../../shared/database";
import { InviteUserDto, SyncClerkUserDTO, UserRoleEnum, UserStatusEnum } from "../interface";
import { userLocationsSchema, userSchema } from "../schema";
import logger from "../../../shared/logger";

class UserService extends BaseService<typeof userSchema> {
    constructor() {
        super(userSchema);
    }

    public async listStaff(page: number, pageSize: number) {
        return this.getAllPaginated(page, pageSize);
    }

    public async getUserProfile(userId: string) {
        return this.getByIdOrError(userId, "User not found.");
    }

    public async updateUserStatus(userId: string, status: UserStatusEnum) {
        return this.updateByQuery(eq(userSchema.id, userId), { status });
    }

    public async inviteUser(userData: InviteUserDto) {
        return await db.transaction(async (tx) => {
            const { locationId, ...userInsertData } = userData;

            // Insert the pending user
            const [newUser] = await tx
                .insert(userSchema)
                .values({
                    ...userInsertData,
                    status: UserStatusEnum.INVITED,
                    clerkId: `pending-${crypto.randomUUID()}`,
                })
                .returning();

            // Assign the user to the junction table using the single locationId
            if (locationId) {
                await tx.insert(userLocationsSchema).values({
                    userId: newUser.id,
                    locationId: locationId,
                });
            }

            return newUser;
        });
    }

    public async assignLocationToUser(userId: string, locationId: string) {
        await this.getByIdOrError(userId, "User does not exist.");

        const [assignment] = await db.insert(userLocationsSchema).values({ userId, locationId }).returning();

        return assignment;
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
