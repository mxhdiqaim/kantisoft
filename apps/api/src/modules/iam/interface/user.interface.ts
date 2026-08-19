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
    tenantId: string;
    email: string;
    role: UserRoleEnum;
    locationId: string;
    phone?: string;
};

export type OnboardBusinessDTO = {
    businessName: string;
    clerkUserId: string;
    countryId: string;
    slug?: string;
};
