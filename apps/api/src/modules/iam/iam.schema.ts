import { pgEnum, pgTable, text, timestamp, uuid, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { UserRoleEnum, UserStatusEnum } from "./interface";

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

export const tenantSchema = pgTable("tenants", {
    id: uuid("id")
        .primaryKey()
        .$defaultFn(() => uuidv7()),
    name: text("name").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
        .defaultNow()
        .notNull()
        .$onUpdateFn(() => new Date()),
});

export const locationSchema = pgTable("locations", {
    id: uuid("id")
        .primaryKey()
        .$defaultFn(() => uuidv7()),
    tenantId: uuid("tenantId")
        .references(() => tenantSchema.id, { onDelete: "cascade" })
        .notNull(),
    name: text("name").notNull(),
    address: text("address"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
        .defaultNow()
        .notNull()
        .$onUpdateFn(() => new Date()),
});

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

// Junction Table for User <-> Location mapping
export const userLocationsSchema = pgTable(
    "user_locations",
    {
        userId: uuid("userId")
            .references(() => userSchema.id, { onDelete: "cascade" })
            .notNull(),
        locationId: uuid("locationId")
            .references(() => locationSchema.id, { onDelete: "cascade" })
            .notNull(),
    },
    (t) => ({
        // Prevents assigning the same user to the exact same location twice
        pk: primaryKey({ columns: [t.userId, t.locationId] }),
    }),
);

export type InsertUserSchemaT = typeof userSchema.$inferInsert;
export type InsertTenantSchemaT = typeof tenantSchema.$inferInsert;
export type InsertLocationSchemaT = typeof locationSchema.$inferInsert;
export type InsertUserLocationSchemaT = typeof userLocationsSchema.$inferInsert;

export const tenantSchemaRelations = relations(tenantSchema, ({ many }) => ({
    locations: many(locationSchema),
    users: many(userSchema),
}));

export const locationSchemaRelations = relations(locationSchema, ({ one, many }) => ({
    tenant: one(tenantSchema, {
        fields: [locationSchema.tenantId],
        references: [tenantSchema.id],
    }),
    userLocations: many(userLocationsSchema),
}));

export const userSchemaRelations = relations(userSchema, ({ one, many }) => ({
    tenant: one(tenantSchema, {
        fields: [userSchema.tenantId],
        references: [tenantSchema.id],
    }),
    userLocations: many(userLocationsSchema),
}));

export const userLocationSchemaRelations = relations(userLocationsSchema, ({ one }) => ({
    user: one(userSchema, {
        fields: [userLocationsSchema.userId],
        references: [userSchema.id],
    }),
    location: one(locationSchema, {
        fields: [userLocationsSchema.locationId],
        references: [locationSchema.id],
    }),
}));
