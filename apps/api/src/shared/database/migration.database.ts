import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, DBClient } from "./index";
import logger from "../logger";

class MigrationRunner {
    public async run(): Promise<void> {
        logger.info("🚀 Starting database migrations...");

        try {
            // The migrator reads the generated SQL files and applies them to the database
            await migrate(db, { migrationsFolder: "./migrations" });

            logger.info("✅ Database migrations completed successfully.");
        } catch (error) {
            logger.error("❌ Migration failed:", error as Error);
            process.exit(1);
        } finally {
            // Gracefully close the PostgreSQL connection so the Node script can exit
            logger.info("Closing migration database connection...");
            await DBClient.end({ timeout: 5 });
        }
    }
}

const migrator = new MigrationRunner();
migrator.run();
