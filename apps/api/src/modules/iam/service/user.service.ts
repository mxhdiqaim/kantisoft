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

    public async assignBranchToUser(userId: string, branchId: string) {
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

        // Check if this is an INVITED user finalising their account
        const [pendingUser] = await db.select().from(userSchema).where(eq(userSchema.email, email)).limit(1);

        if (pendingUser) {
            if (!pendingUser.clerkId.startsWith("pending-")) {
                logger.warn(`User with email ${email} already fully exists. Skipping creation.`);
                return pendingUser;
            }

            // The user was invited! Update their pending row with their real Clerk ID and activate them.
            const [activatedUser] = await db
                .update(userSchema)
                .set({
                    clerkId,
                    status: UserStatusEnum.ACTIVE,
                    avatarUrl: avatarUrl || null,
                    // Notice we DO NOT overwrite role, businessId, or branchId. We keep what the Owner set!
                })
                .where(eq(userSchema.id, pendingUser.id))
                .returning();

            return activatedUser;
        }

        // A brand-new Owner signing up from the homepage
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
