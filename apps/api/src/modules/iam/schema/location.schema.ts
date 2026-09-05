import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { tenantSchema } from "./tenant.schema";
import { userLocationsSchema } from "./user-location.schema";

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

export type InsertLocationSchemaT = typeof locationSchema.$inferInsert;

export const locationSchemaRelations = relations(locationSchema, ({ one, many }) => ({
    tenant: one(tenantSchema, {
        fields: [locationSchema.tenantId],
        references: [tenantSchema.id],
    }),
    userLocations: many(userLocationsSchema),
}));
