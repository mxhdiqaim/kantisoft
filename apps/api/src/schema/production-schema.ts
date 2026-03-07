import {
    doublePrecision,
    pgTable,
    text,
    timestamp,
    uuid,
} from "drizzle-orm/pg-core";
import { menuItems } from "./menu-items-schema";
import { stores } from "./stores-schema";
import { users } from "./users-schema";

export const productions = pgTable("productions", {
    id: uuid("id").defaultRandom().primaryKey(),
    batchReference: text("batchReference").notNull().unique(), // e.g., PROD-ABC12345

    menuItemId: uuid("menuItemId")
        .notNull()
        .references(() => menuItems.id),
    storeId: uuid("storeId")
        .notNull()
        .references(() => stores.id),

    quantityProduced: doublePrecision("quantityProduced").notNull(),

    // Financial Snapshot at the time of production
    totalIngredientCost: doublePrecision("totalIngredientCost").default(0),
    potentialRevenue: doublePrecision("potentialRevenue").default(0),

    // Auditing
    performedBy: uuid("performedBy").references(() => users.id),
    notes: text("notes"),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    lastModified: timestamp("lastModified")
        .defaultNow()
        .notNull()
        .$onUpdateFn(() => new Date()),
});

export type ProductionSchemaT = typeof productions.$inferSelect;
