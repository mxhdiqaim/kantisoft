import { migrate } from "drizzle-orm/postgres-js/migrator";
import db, { client } from "../shared/database";

const migrateDB = async () => {
    console.log("🚀 Migration start");

    try {
        // Postgres.js migrator is very efficient
        await migrate(db, { migrationsFolder: "./migrations" });
        console.log("✅ Migration done");
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    } finally {
        // Close the connection gracefully
        await client.end();
    }
};

migrateDB();
