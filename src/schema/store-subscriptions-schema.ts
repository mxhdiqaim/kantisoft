import {
    boolean,
    decimal,
    integer,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uuid,
} from "drizzle-orm/pg-core";
import { stores } from "./stores-schema";
import { z } from "zod";

export const subscriptionStatusEnum = pgEnum("subscriptionStatus", [
    "pendingSetup", // Paid 400k, but not live
    "active", // Monthly sub is paid
    "gracePeriod", // 3 days past due
    "suspended", // Locked due to non-payment
    "cancelled",
]);

export const storeSubscriptions = pgTable("storeSubscriptions", {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: uuid("storeId")
        .references(() => stores.id)
        .unique()
        .notNull(),

    status: subscriptionStatusEnum("status").default("pendingSetup").notNull(),

    // Seat Management
    baseUserLimit: integer("baseUserLimit").default(1).notNull(),
    isCapped: boolean("isCapped").default(false).notNull(), // True if 5+ users

    // Billing Dates
    nextBillingDate: timestamp("nextBillingDate"),
    lastBillingDate: timestamp("lastBillingDate"),

    // Nigerian Market Specifics
    setupFeePaid: boolean("setupFeePaid").default(false).notNull(),
    autoRenew: boolean("autoRenew").default(false).notNull(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
        .defaultNow()
        .$onUpdateFn(() => new Date()),
});

export const billingStatusEnum = pgEnum("billingStatus", [
    "failed",
    "pending",
    "success",
]);

export const billingTypeEnum = pgEnum("billingType", [
    "setupFee",
    "monthlySubscription",
    "additionalUser",
]);

export const billingTransactions = pgTable("billingTransactions", {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: uuid("storeId").references(() => stores.id),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    type: billingTypeEnum("type").default("setupFee"), // 'setupFee', 'monthlySubscription', 'additionalUser'
    reference: text("reference").unique(), // Paystack/Flutterwave Ref
    status: billingStatusEnum("status").default("pending"), // 'success', 'failed'

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
        .defaultNow()
        .$onUpdateFn(() => new Date()),
});

export const onboardStoreSchema = z.object({
    firstName: z.string().min(2, "First name is too short"),
    lastName: z.string().min(2, "Last name is too short"),
    email: z.string().email("Invalid email address"),
    storeName: z.string().min(3, "Store name must be at least 3 characters"),
    location: z.string().min(3, "Location description is required"),
    phone: z.string().optional(),
});

// Infer the TypeScript type from the schema
export type OnboardStoreInput = z.infer<typeof onboardStoreSchema>;
