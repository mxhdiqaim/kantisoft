import { eq } from "drizzle-orm";
import { BaseService } from "../../../shared/service";
import { db } from "../../../shared/database";
import { InviteUserDto, UserRoleEnum, UserStatusEnum } from "../interface";
import { userLocationsSchema, userSchema } from "../schema";

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

    /*
     * ONBOARDING STEP 1
     * Handles newly registered users from Clerk.
     */
    public async syncClerkUserCreated(
        clerkId: string,
        firstName: string,
        lastName: string,
        email: string,
        phone: string,
    ) {
        // Check if this email belongs to an invited staff member
        const existingUser = await this.get(eq(userSchema.email, email));

        if (existingUser) {
            // It's an invited staff member! Sync their new Clerk ID and activate them.
            const [updatedUser] = await this.updateByQuery(eq(userSchema.id, existingUser.id), {
                clerkId,
                firstName,
                lastName,
                status: UserStatusEnum.ACTIVE,
            });
            return updatedUser;
        }

        // If it's a brand-new Business Owner. We create their profile immediately, leaving tenantId as null.
        const [newOwner] = await db
            .insert(userSchema)
            .values({
                clerkId,
                firstName,
                lastName,
                email,
                phone,
                role: UserRoleEnum.OWNER,
                status: UserStatusEnum.ACTIVE,
            })
            .returning();

        return newOwner;
    }
}

export default new UserService();
