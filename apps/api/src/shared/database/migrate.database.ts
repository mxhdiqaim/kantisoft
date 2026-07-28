import { migrate } from "drizzle-orm/postgres-js/migrator";
import db, { database } from "./index";

const migrateDB = async () => {
    console.log("🚀 Migration start");

    try {
        await migrate(db, { migrationsFolder: "./migrations" });
        console.log("✅ Migration done");
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    } finally {
        // Close the connection gracefully
        await database.client.end();
    }
};

migrateDB();
