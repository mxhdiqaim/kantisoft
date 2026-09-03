import { pgTable, text, timestamp, uuid, uniqueIndex, numeric, AnyPgColumn } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { userSchema } from "./user.schema";
import { branchSchema } from "./branch.schema";
import { addressSchema, countrySchema } from "../../../shared/database/schema";

export const businessSchema = pgTable(
    "businesses",
    {
        id: uuid("id")
            .primaryKey()
            .$defaultFn(() => uuidv7()),
        userId: uuid("user_id")
            .references((): AnyPgColumn => userSchema.id, { onDelete: "cascade" })
            .notNull(),
        businessName: text("name").notNull(),
        slug: text("slug").notNull(),
        countryId: uuid("country_id")
            .references(() => countrySchema.id, { onDelete: "restrict" })
            .notNull(),
        addressId: uuid("address_id").references(() => addressSchema.id, { onDelete: "set null" }),
        description: text("description"),
        logoUrl: text("logo_url"),
        teamSize: numeric("team_size").default("0"),
        companyRegistrationNumber: text("company_registration_number"),
        taxOrVatId: text("tax_or_vat_id"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (t) => ({
        // Unique indexes prevent duplicates and speed up queries
        userIdIdx: uniqueIndex("businesses_user_id_idx").on(t.userId),
        slugIdx: uniqueIndex("businesses_slug_idx").on(t.slug),
    }),
);

export type InsertBusinessSchemaT = typeof businessSchema.$inferInsert;

export const businessSchemaRelations = relations(businessSchema, ({ one, many }) => ({
    owner: one(userSchema, {
        fields: [businessSchema.userId],
        references: [userSchema.id],
    }),
    branches: many(branchSchema),
}));
