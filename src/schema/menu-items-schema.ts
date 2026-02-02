import {
    boolean,
    numeric,
    pgTable,
    text,
    timestamp,
    unique,
    uuid,
} from "drizzle-orm/pg-core";
import { stores } from "./stores-schema";
import { categories } from "./categories-schema";

export const menuItems = pgTable(
    "menuItems",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        name: text("name").notNull(),
        description: text("description"),

        // Link to Category
        categoryId: uuid("categoryId").references(() => categories.id, {
            onDelete: "set null",
        }),

        sku: text("sku"),
        itemCode: text("itemCode"), // itemCode is used for barcodes and SKU for internal tracking

        price: numeric("price", { precision: 10, scale: 2 }).notNull(),
        storeId: uuid("storeId").references(() => stores.id),
        isAvailable: boolean("isAvailable").notNull().default(true),
        createdAt: timestamp("createdAt").defaultNow().notNull(),
        lastModified: timestamp("lastModified")
            .defaultNow()
            .notNull()
            .$onUpdateFn(() => new Date()),
    },
    (table) => {
        return {
            // Add a composite unique constraint on (storeId, name)
            menuItemNameUniquePerStore: unique(
                "menuItems_name_store_unique",
            ).on(table.storeId, table.name),

            // If itemCode should also be unique per store
            menuItemItemCodeUniquePerStore: unique(
                "menuItems_itemCode_store_unique",
            ).on(table.storeId, table.itemCode),

            // Ensure SKU is unique per store
            menuItemSkuUniquePerStore: unique("menuItems_sku_store_unique").on(
                table.storeId,
                table.sku,
            ),
        };
    },
);

export type MenuSchemaT = typeof menuItems.$inferSelect;
export type InsertMenuSchemaT = typeof menuItems.$inferInsert;
