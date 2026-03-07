import { relations } from "drizzle-orm";
import { categories } from "../categories-schema";
import { menuItems } from "../menu-items-schema";

// Define relations so you can fetch items belonging to a category
export const categoriesRelations = relations(categories, ({ many }) => ({
    menuItems: many(menuItems),
}));
