import { pgEnum, pgTable, text, timestamp, uuid, index, uniqueIndex, AnyPgColumn } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { UserRoleEnum, UserStatusEnum } from "../interface";
import { businessSchema } from "./business.schema";
import { branchSchema } from "./branch.schema";

export const UserRolePgEnum = pgEnum("role", [
    UserRoleEnum.OWNER,
    UserRoleEnum.ADMIN,
    UserRoleEnum.MANAGER,
    UserRoleEnum.STAFF,
    UserRoleEnum.CASHIER,
    UserRoleEnum.GUEST,
]);

export const UserStatusPgEnum = pgEnum("status", [
    UserStatusEnum.ACTIVE,
    UserStatusEnum.INACTIVE,
    UserStatusEnum.DELETED,
    UserStatusEnum.BANNED,
    UserStatusEnum.INVITED,
]);

export const userSchema = pgTable(
    "users",
    {
        id: uuid("id")
            .primaryKey()
            .$defaultFn(() => uuidv7()),
        clerkId: text("clerk_id").notNull(),
        businessId: uuid("business_id").references((): AnyPgColumn => businessSchema.id, { onDelete: "set null" }),
        branchId: uuid("branch_id").references(() => branchSchema.id, { onDelete: "set null" }),
        firstName: text("first_name").notNull(),
        lastName: text("last_name").notNull(),
        email: text("email").notNull(),
        phoneNumber: text("phone_number"),
        phoneNumberVerifiedAt: timestamp("phone_number_verified_at"),
        avatarUrl: text("avatar_url"),
        role: UserRolePgEnum("role").notNull().default(UserRoleEnum.CASHIER),
        status: UserStatusPgEnum("status").notNull().default(UserStatusEnum.ACTIVE),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (t) => ({
        clerkIdIdx: uniqueIndex("users_clerk_id_idx").on(t.clerkId),
        emailIdx: uniqueIndex("users_email_idx").on(t.email),
        phoneIdx: uniqueIndex("users_phone_number_idx").on(t.phoneNumber),
        branchIdx: index("users_branch_id_idx").on(t.branchId),
        businessIdx: index("users_business_id_idx").on(t.businessId),
    }),
);

export type InsertUserSchemaT = typeof userSchema.$inferInsert;

export const userSchemaRelations = relations(userSchema, ({ one }) => ({
    // The business this user OWNS (derived from businessSchema.userId)
    ownedBusiness: one(businessSchema),

    // The business this user WORKS FOR (derived from userSchema.businessId)
    business: one(businessSchema, {
        fields: [userSchema.businessId],
        references: [businessSchema.id],
    }),

    // The branch this user WORKS AT
    branch: one(branchSchema, {
        fields: [userSchema.branchId],
        references: [branchSchema.id],
    }),
}));
