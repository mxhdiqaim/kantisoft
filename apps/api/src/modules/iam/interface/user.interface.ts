import { InsertBusinessSchemaT } from "../schema";

export enum UserRoleEnum {
    OWNER = "owner",
    ADMIN = "admin",
    MANAGER = "manager",
    STAFF = "staff",
    CASHIER = "cashier",
    GUEST = "guest",
}

export enum UserStatusEnum {
    ACTIVE = "active",
    INACTIVE = "inactive",
    DELETED = "deleted",
    BANNED = "banned",
    INVITED = "invited",
}

export type InviteUserDto = {
    businessId: string;
    branchId: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRoleEnum;
    phoneNumber?: string;
};

export type OnboardBusinessDTO = Omit<InsertBusinessSchemaT, "id" | "userId" | "createdAt" | "updatedAt" | "slug">;

export type SyncClerkUserDTO = {
    clerkId: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    avatarUrl?: string;
    role?: UserRoleEnum;
};
