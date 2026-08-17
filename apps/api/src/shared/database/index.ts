import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import schema from "../../db/schema";
import { getEnvVariable } from "../utils";
import logger from "../logger";

class Database {
    private readonly DB_CONNECTION_STRING = getEnvVariable("DB_CONNECTION_STRING");
    private readonly DB_SSL_REQUIRED = getEnvVariable("DB_SSL_REQUIRED") === "true";
    private readonly DB_MAX_CONNECTION = parseInt(getEnvVariable("DB_MAX_CONNECTION")) ?? 10;

    public readonly client: postgres.Sql;
    public readonly orm: PostgresJsDatabase<typeof schema>;

    constructor() {
        this.client = postgres(this.DB_CONNECTION_STRING, {
            max: this.DB_MAX_CONNECTION,
            ssl: this.DB_SSL_REQUIRED ? { rejectUnauthorized: false } : false,
            prepare: false,
        });

        this.orm = drizzle(this.client, { schema });
    }

    public connect = async (): Promise<void> => {
        try {
            await this.client`SELECT 1`;
            logger.info("Database connection pool established.");
        } catch (error) {
            logger.error("Database Connection Error", error as Error);
            throw error;
        }
    };

    public disconnect = async (): Promise<void> => {
        try {
            logger.info("Closing database connection pool...");
            await this.client.end({ timeout: 5 });
            logger.info("Database connection pool safely closed.");
        } catch (error) {
            logger.error("Error closing database connections", error as Error);
            throw error;
        }
    };
}

// Instantiate the module-level singleton
export const database = new Database();
export const client = database.client;

const db = database.orm;
export default db;
