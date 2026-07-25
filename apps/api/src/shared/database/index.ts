import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import schema from "../../db/schema";
import { getEnvVariable } from "../utils";
import logger from "../logger";

const connectionString = getEnvVariable("DB_CONNECTION_STRING");
const sslRequired = getEnvVariable("DB_SSL_REQUIRED") === "true";

// postgres.js handles connection pooling natively based on the 'max' parameter
export const client = postgres(connectionString, {
    max: 10,
    ssl: sslRequired ? { rejectUnauthorized: false } : false,
    prepare: false,
});

const db = drizzle(client, { schema });
export default db;

export const connect = async () => {
    try {
        await client`SELECT 1`;
        logger.info("Database connection pool established.");
    } catch (error) {
        logger.error("Database Connection Error", error as Error);
        throw error;
    }
};

export const disconnect = async () => {
    try {
        logger.info("Closing database connection pool...");

        await client.end({ timeout: 5 });

        logger.info("Database connection pool safely closed.");
    } catch (error) {
        logger.error("Error closing database connections", error as Error);
        throw error;
    }
};
