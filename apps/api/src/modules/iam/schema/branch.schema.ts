import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { businessSchema } from "./business.schema";
import { userSchema } from "./user.schema";
import { addressSchema } from "../../../shared/database/schema";

export const branchSchema = pgTable(
    "branches",
    {
        id: uuid("id")
            .primaryKey()
            .$defaultFn(() => uuidv7()),
        businessId: uuid("business_id")
            .references(() => businessSchema.id, { onDelete: "cascade" })
            .notNull(),
        addressId: uuid("address_id").references(() => addressSchema.id, { onDelete: "set null" }),
        name: text("name").notNull().unique(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (t) => ({
        businessIdx: index("branches_business_id_idx").on(t.businessId),
    }),
);

export type InsertBranchSchemaT = typeof branchSchema.$inferInsert;

export const branchSchemaRelations = relations(branchSchema, ({ one, many }) => ({
    business: one(businessSchema, {
        fields: [branchSchema.businessId],
        references: [businessSchema.id],
    }),
    staff: many(userSchema),
}));
