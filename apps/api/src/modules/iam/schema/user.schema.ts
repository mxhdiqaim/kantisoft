import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { UserRoleEnum, UserStatusEnum } from "../interface";
import { tenantSchema } from "./tenant.schema";
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
    clerkId: text("clerkId").unique().notNull(),
    firstName: text("firstName").notNull(),
    lastName: text("lastName").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone").notNull().unique(),
    role: UserRolePgEnum("role").notNull().default(UserRoleEnum.CASHIER),
    status: UserStatusPgEnum("status").notNull().default(UserStatusEnum.ACTIVE),

    // Users are tied strictly to the business (tenant).
    // Location assignments are handled by the user_locations junction table below.
    tenantId: uuid("tenantId")
        .references(() => tenantSchema.id, { onDelete: "cascade" })
        .notNull(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
        .defaultNow()
        .notNull()
        .$onUpdateFn(() => new Date()),
});

export type InsertUserSchemaT = typeof userSchema.$inferInsert;

export const userSchemaRelations = relations(userSchema, ({ one, many }) => ({
    tenant: one(tenantSchema, {
        fields: [userSchema.tenantId],
        references: [tenantSchema.id],
    }),
    userLocations: many(userLocationsSchema),
}));
