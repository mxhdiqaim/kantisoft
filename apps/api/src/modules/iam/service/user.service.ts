import { eq } from "drizzle-orm";
import { BaseService } from "../../../shared/service";
import { db } from "../../../shared/database";
import { UserStatusEnum } from "../interface";
import { InsertUserSchemaT, userLocationsSchema, userSchema } from "../schema";

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

    public async inviteUser(userData: Omit<InsertUserSchemaT, "clerkId" | "status">, assignedLocationIds: string[]) {
        return await db.transaction(async (tx) => {
            const [newUser] = await tx
                .insert(userSchema)
                .values({
                    ...userData,
                    status: UserStatusEnum.INVITED,
                    clerkId: `pending-${crypto.randomUUID()}`,
                })
                .returning();

            if (assignedLocationIds.length > 0) {
                const locationAssignments = assignedLocationIds.map((locationId) => ({
                    userId: newUser.id,
                    locationId: locationId,
                }));

                await tx.insert(userLocationsSchema).values(locationAssignments);
            }

            return newUser;
        });
    }

    public async assignLocationToUser(userId: string, locationId: string) {
        await this.getByIdOrError(userId, "User does not exist.");

        const [assignment] = await db.insert(userLocationsSchema).values({ userId, locationId }).returning();

        return assignment;
    }
}

export default new UserService();
