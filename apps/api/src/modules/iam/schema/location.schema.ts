import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { businessSchema } from "./business.schema";
import { userLocationsSchema } from "./user-location.schema";

export const locationSchema = pgTable("locations", {
    id: uuid("id")
        .primaryKey()
        .$defaultFn(() => uuidv7()),
    businessId: uuid("business_id")
        .references(() => businessSchema.id, { onDelete: "cascade" })
        .notNull(),
    name: text("name").notNull(),
    address: text("address"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .notNull()
        .$onUpdateFn(() => new Date()),
});

export type InsertLocationSchemaT = typeof locationSchema.$inferInsert;

export const locationSchemaRelations = relations(locationSchema, ({ one, many }) => ({
    business: one(businessSchema, {
        fields: [locationSchema.businessId],
        references: [businessSchema.id],
    }),
    userLocations: many(userLocationsSchema),
}));
