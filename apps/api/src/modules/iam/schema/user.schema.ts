import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { UserRoleEnum, UserStatusEnum } from "../interface";
import { businessSchema } from "./business.schema";
import { userLocationsSchema } from "./user-location.schema";

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

export const userSchema = pgTable("users", {
    id: uuid("id")
        .primaryKey()
        .$defaultFn(() => uuidv7()),
    clerkId: text("clerk_id").unique().notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull().unique(),
    phoneNumber: text("phone_number").unique(),
    phoneNumberVerifiedAt: timestamp("phone_number_verified_at"),
    avatarUrl: text("avatar_url"),
    role: UserRolePgEnum("role").notNull().default(UserRoleEnum.CASHIER),
    status: UserStatusPgEnum("status").notNull().default(UserStatusEnum.ACTIVE),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .notNull()
        .$onUpdateFn(() => new Date()),
});

export type InsertUserSchemaT = typeof userSchema.$inferInsert;

export const userSchemaRelations = relations(userSchema, ({ one, many }) => ({
    // Defines the inverse of the 1-to-1 relationship (the user owns one business)
    ownedBusiness: one(businessSchema),
    userLocations: many(userLocationsSchema),
}));
