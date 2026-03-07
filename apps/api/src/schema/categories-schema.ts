import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { stores } from "./stores-schema";

export const categories = pgTable(
    "categories",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        name: text("name").notNull(),
        description: text("description"),
        storeId: uuid("storeId").references(() => stores.id, {
            onDelete: "cascade",
        }),
        createdAt: timestamp("createdAt").defaultNow().notNull(),
        lastModified: timestamp("lastModified").defaultNow().notNull(),
    },
    (table) => ({
        // Ensure category names are unique per store
        categoryNameUniquePerStore: unique("categories_name_store_unique").on(
            table.storeId,
            table.name,
        ),
    }),
);
