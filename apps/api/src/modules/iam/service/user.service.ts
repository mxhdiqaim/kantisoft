import { and, eq } from "drizzle-orm";
import { BaseService } from "../../../shared/service";
import { db } from "../../../shared/database";
import { InviteUserDto, SyncClerkUserDTO, UserRoleEnum, UserStatusEnum } from "../interface";
import { branchSchema, userSchema } from "../schema";
import logger from "../../../shared/logger";
import { branchService } from "./index";
import { helperUtil } from "../../../shared/utils";
import { createClerkClient } from "@clerk/express";
import { ConflictError, ForbiddenError } from "../../../shared/errors/custom.error";

class UserService extends BaseService<typeof userSchema> {
    constructor() {
        super(userSchema, "User");
    }

    private readonly CLERK_SECRET_KEY = helperUtil.getEnvVariable("CLERK_SECRET_KEY");

    private clerkClient = createClerkClient({
        secretKey: this.CLERK_SECRET_KEY,
    });

    public async inviteUser(data: InviteUserDto & { businessId: string }) {
        const { branchId, businessId, firstName, lastName, email, role, phoneNumber } = data;

        // Ensure branch exists AND belongs to the requesting business
        await branchService.getOrError(and(eq(branchSchema.id, branchId), eq(branchSchema.businessId, businessId)));

        // Prevent Duplicate Invites
        const existingUser = await this.validateField("email", email);
        if (existingUser) {
            throw new ConflictError("A user with this email address already exists.");
        }

        return await db.transaction(async (tx) => {
            // Create the pending user in our local database
            const [newUser] = await tx
                .insert(userSchema)
                .values({
                    businessId,
                    branchId,
                    firstName,
                    lastName,
                    email,
                    role,
                    phoneNumber,
                    status: UserStatusEnum.INVITED,
                    clerkId: `pending-${crypto.randomUUID()}`,
                })
                .returning();

            // Send the official invite via Clerk!
            // We pass the role and IDs into publicMetadata so the user gets them immediately upon signing up
            await this.clerkClient.invitations.createInvitation({
                emailAddress: email,
                publicMetadata: {
                    userId: newUser.id,
                    role: role,
                    businessId: businessId,
                    branchId: branchId,
                },
                ignoreExisting: true,
            });

            return newUser;
        });
    }

    public async assignUserToBranch(userId: string, branchId: string) {
        const user = await this.getByIdOrError(userId);
        const branch = await branchService.getByIdOrError(branchId);

        // Ensure the branch belongs to the user's business
        if (branch.businessId !== user.businessId) {
            throw new ForbiddenError("Cannot assign staff to a branch outside of their assigned business.");
        }

        const [updatedUser] = await db
            .update(userSchema)
            .set({ branchId })
            .where(eq(userSchema.id, userId))
            .returning();

        // Update Clerk Metadata so their JWT gets the new branch
        if (!user.clerkId.startsWith("pending-")) {
            await this.clerkClient.users.updateUserMetadata(user.clerkId, {
                publicMetadata: {
                    userId: updatedUser.id,
                    role: updatedUser.role,
                    businessId: updatedUser.businessId,
                    branchId: updatedUser.branchId,
                },
            });
        }

        return updatedUser;
    }

    public async syncClerkUserCreated(data: SyncClerkUserDTO) {
        const { clerkId, email, firstName, lastName, phoneNumber, avatarUrl, role } = data;

        // Check if the user already exists in the database
        const [existingUser] = await db.select().from(userSchema).where(eq(userSchema.email, email)).limit(1);

        if (existingUser) {
            // User was INVITED ("pending-") OR is a GHOST USER (old Clerk ID)
            if (existingUser.clerkId.startsWith("pending-") || existingUser.clerkId !== clerkId) {
                logger.info(`Healing/Activating existing user ${email} with new Clerk ID: ${clerkId}`);

                const [activatedUser] = await db
                    .update(userSchema)
                    .set({
                        clerkId,
                        status: UserStatusEnum.ACTIVE,
                        avatarUrl: avatarUrl || existingUser.avatarUrl,
                        firstName: firstName || existingUser.firstName,
                        lastName: lastName || existingUser.lastName,
                        phoneNumber: phoneNumber || existingUser.phoneNumber,
                        // DO NOT overwrite role, businessId, or branchId!
                    })
                    .where(eq(userSchema.id, existingUser.id))
                    .returning();

                return activatedUser;
            }

            // Strict Idempotency (Clerk sometimes fires the same webhook twice)
            logger.info(`User with email ${email} already fully exists with this clerkId. Skipping.`);
            return existingUser;
        }

        // A brand-new Owner signing up directly from the homepage
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
                status: UserStatusEnum.ACTIVE,
            })
            .returning();

        logger.info(`Created brand new user ${email} in database.`);

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
                updatedAt: new Date(),
            })
            .where(eq(userSchema.clerkId, clerkId))
            .returning();

        if (!updatedUser) {
            logger.warn(`Attempted to update Clerk user ${clerkId}, but they do not exist in DB.`);
        }

        return updatedUser;
    }

    public async syncClerkUserDeleted(clerkId: string) {
        const [deletedUser] = await db.delete(userSchema).where(eq(userSchema.clerkId, clerkId)).returning();

        if (deletedUser) {
            logger.info(`Successfully deleted user ${deletedUser.email} from database.`);
        } else {
            logger.warn(`Clerk deleted user ${clerkId}, but they were already missing from DB.`);
        }

        return deletedUser;
    }
}

export default new UserService();
