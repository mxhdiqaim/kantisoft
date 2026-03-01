import cron from "node-cron";
import db from "../db";
import { users } from "../schema/users-schema";
import { and, eq, lt, sql } from "drizzle-orm";
import { storeSubscriptions } from "../schema/store-subscriptions";

const DAILY_CHECK_TIME = "0 0 * * *"; // Every midnight

cron.schedule(DAILY_CHECK_TIME, async () => {
    console.log("🚀 Starting Midnight Billing Check...");
    const today = new Date();

    // Get all stores whose 'nextBillingDate' is today or in the past
    const dueSubscriptions = await db.query.storeSubscriptions.findMany({
        where: and(
            eq(storeSubscriptions.status, "active"),
            lt(storeSubscriptions.nextBillingDate, today),
        ),
    });

    for (const sub of dueSubscriptions) {
        // Count active users for this store
        const userCountResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(eq(users.storeId, sub.storeId));

        const activeUsers = Number(userCountResult[0]?.count || 0);

        // Calculate Bill (₦9,000 per user, capped at ₦45,000)
        const amountToCharge = Math.min(activeUsers * 9000, 45000);

        console.log(
            `Store ${sub.storeId}: ${activeUsers} users. Billing: ₦${amountToCharge}`,
        );

        // Logic: Move to Grace Period first
        // In Nigeria, instead of auto-charging, it's safer to give 3 days
        // to pay via bank transfer/Paystack before locking the POS.
        await db
            .update(storeSubscriptions)
            .set({
                status: "gracePeriod",
                updatedAt: new Date(),
            })
            .where(eq(storeSubscriptions.id, sub.id));

        // 5Send Notification (Email/SMS)
        // sendBillingAlert(sub.storeId, amountToCharge);
    }

    console.log("✅ Billing Check Completed.");
});
