import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { userSchema } from "./user.schema";
import { locationSchema } from "./location.schema";
import { addressSchema, countrySchema } from "../../../shared/database/schema";

export const tenantSchema = pgTable("tenants", {
    id: uuid("id")
        .primaryKey()
        .$defaultFn(() => uuidv7()),
    userId: uuid("user_id")
        .references(() => userSchema.id, { onDelete: "cascade" })
        .notNull()
        .unique(),
    tenantName: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    countryId: uuid("country_id")
        .references(() => countrySchema.id, { onDelete: "restrict" })
        .notNull(),
    addressId: uuid("address_id").references(() => addressSchema.id, { onDelete: "set null" }),
    description: text("description"),
    logoUrl: text("logo_url"),
    teamSize: text("team_size"),
    companyRegistrationNumber: text("company_registration_number"),
    taxOrVatId: text("tax_or_vat_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .notNull()
        .$onUpdateFn(() => new Date()),
});

export type InsertTenantSchemaT = typeof tenantSchema.$inferInsert;

export const tenantSchemaRelations = relations(tenantSchema, ({ one, many }) => ({
    // Defines the direct 1-to-1 relationship holding the foreign key
    owner: one(userSchema, {
        fields: [tenantSchema.userId],
        references: [userSchema.id],
    }),
    locations: many(locationSchema),
}));
