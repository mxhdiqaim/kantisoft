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
    firstName: string;
    lastName: string;
    businessId: string;
    email: string;
    role: UserRoleEnum;
    locationId: string;
    phone?: string;
};

export interface OnboardBusinessDTO extends Omit<
    InsertBusinessSchemaT,
    "id" | "userId" | "createdAt" | "updatedAt" | "slug"
> {
    clerkUserId: string;
}

export type SyncClerkUserDTO = {
    clerkId: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    avatarUrl?: string;
    role?: UserRoleEnum;
};
