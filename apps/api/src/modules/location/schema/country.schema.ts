import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { addressSchema } from "./address.schema";

export const countrySchema = pgTable("countries", {
    id: uuid("id")
        .primaryKey()
        .$defaultFn(() => uuidv7()),
    countryName: text("name").notNull(),
    countryCode: text("code").notNull().unique(), // 'NG', 'US'
    phoneCode: text("phoneCode").notNull(), // '+234', '+1'
    currency: text("currency").notNull(), // 'NGN', 'USD'
    currencySymbol: text("currencySymbol").notNull(), // '₦', '$'
    flagEmoji: text("flagEmoji"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
        .defaultNow()
        .notNull()
        .$onUpdateFn(() => new Date()),
});

export type InsertCountrySchemaT = typeof countrySchema.$inferInsert;

export const countrySchemaRelations = relations(countrySchema, ({ many }) => ({
    addresses: many(addressSchema),
}));
