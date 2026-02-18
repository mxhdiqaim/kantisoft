import {
    boolean,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users-schema";
import { stores } from "./stores-schema";

// Define your base blocks
const CRUD = ["CREATED", "UPDATED", "DELETED", "VIEWED", "READ"] as const;
const AUTH = ["LOGIN", "LOGOUT", "PASSWORD_CHANGED"] as const;
const MODIFICATION = [
    "ADJUSTED",
    "DECREMENTED",
    "CONTINUED",
    "DISCONTINUED",
] as const;

// Map specific actions to specific entities
const SCOPED_ACTIONS = {
    USER: [...CRUD, ...AUTH, "STORE_CHANGED"],
    STORE: CRUD,
    MENU_ITEM: CRUD,
    ORDER: [...CRUD, "STATUS_UPDATED", "STOCK_DECREMENTED"],
    MANAGER: [...CRUD, "REGISTERED"],
    INVENTORY: [...CRUD, ...MODIFICATION],
    RAW_MATERIAL_INVENTORY: [...CRUD, ...MODIFICATION],
    ORDER_STATUS: [...CRUD],
    ORDER_STOCK: [...CRUD, ...MODIFICATION],
    PASSWORD: ["CHANGED"],
    STOCK_ADJUSTED: [...CRUD, ...MODIFICATION],
    USER_STORE: ["CHANGED"],
} as const;

// Flatten the map and force uniqueness
const rawActions = Object.entries(SCOPED_ACTIONS).flatMap(([entity, actions]) =>
    actions.map((action) => `${entity}_${action}`),
);

// This 'Set' is the shield that prevents the duplicate key error
const generatedActions = Array.from(new Set(rawActions)) as [
    string,
    ...string[],
];

export const activityActionEnum = pgEnum("activityAction", generatedActions);

// (Optional) Extract the TypeScript Type for use in your app
export type ActivityActionType = (typeof generatedActions)[number];

export const entityTypeEnum = pgEnum("entityType", [
    "activity",
    "inventory",
    "menuItem",
    "order",
    "rawMaterial",
    "rawMaterialInventory",
    "store",
    "user",
]);

export const activityLog = pgTable("activityLog", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("userId").references(() => users.id, { onDelete: "set null" }),
    storeId: uuid("storeId").references(() => stores.id, {
        onDelete: "cascade",
    }),
    action: activityActionEnum("action").notNull(),
    entityId: text("entityId"), // e.g., the ID of the order or menu item
    entityType: entityTypeEnum("entityType").notNull().default("activity"), // e.g., 'order', 'menuItem'
    details: text("details").notNull(), // e.g., "User John Doe created order #ORD-123"
    isRead: boolean("isRead").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});
