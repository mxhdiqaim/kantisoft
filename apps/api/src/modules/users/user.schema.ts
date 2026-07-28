import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { stores } from "../../schema/stores-schema";
import { relations } from "drizzle-orm";
import { orders } from "../../schema/orders-schema";

export const userRoleEnum = pgEnum("role", [
    "superAdmin",
    "admin",
    "manager",
    "user",
    "guest",
]);

export const userStatusEnum = pgEnum("status", [
    "active",
    "inactive",
    "deleted",
    "banned",
]);

export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    firebaseUid: text("firebaseUid").unique(),
    firstName: text("firstName").notNull(),
    lastName: text("lastName").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone").notNull().unique(),
    role: userRoleEnum("role").notNull().default("user"),
    status: userStatusEnum("status").notNull().default("active"),
    storeId: uuid("storeId").references(() => stores.id, {
        onDelete: "set null",
    }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    lastModified: timestamp("lastModified")
        .defaultNow()
        .notNull()
        .$onUpdateFn(() => new Date()),
});

export type InsertUserSchemaT = typeof users.$inferInsert;

export const usersRelations = relations(users, ({ one, many }) => ({
    orders: many(orders),
    // A user belongs to one store
    store: one(stores, {
        fields: [users.storeId],
        references: [stores.id],
    }),
}));
