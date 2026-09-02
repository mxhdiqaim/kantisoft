import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { userSchema } from "./user.schema";
import { locationSchema } from "./location.schema";

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

export type InsertTenantSchemaT = typeof tenantSchema.$inferInsert;

export const tenantSchemaRelations = relations(tenantSchema, ({ many }) => ({
    locations: many(locationSchema),
    users: many(userSchema),
}));
