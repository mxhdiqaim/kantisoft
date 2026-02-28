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
