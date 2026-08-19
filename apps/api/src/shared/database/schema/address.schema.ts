import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { countrySchema } from "./country.schema";

export const addressSchema = pgTable("addresses", {
    id: uuid("id")
        .primaryKey()
        .$defaultFn(() => uuidv7()),
    street: text("street").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    postalCode: text("postalCode"),
    countryId: uuid("countryId")
        .references(() => countrySchema.id, { onDelete: "restrict" })
        .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
        .defaultNow()
        .notNull()
        .$onUpdateFn(() => new Date()),
});

export type InsertAddressSchemaT = typeof addressSchema.$inferInsert;

export const addressSchemaRelations = relations(addressSchema, ({ one }) => ({
    country: one(countrySchema, {
        fields: [addressSchema.countryId],
        references: [countrySchema.id],
    }),
}));
