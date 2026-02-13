import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, PoolConfig } from "pg";
import schema from "./schema";
import { getEnvVariable } from "../utils";

export let pool: Pool;

// Conditional Pool configuration based on NODE_ENV
const NODE_ENV = getEnvVariable("NODE_ENV");

if (NODE_ENV === "production") {
    // Get the connection URL
    const connectionString = getEnvVariable("DB_CONNECTION_STRING");
    const sslRequired = getEnvVariable("DB_SSL_REQUIRED") == "true";

    const poolConfig: PoolConfig = {
        connectionString,
    };

    if (sslRequired) {
        poolConfig.ssl = {
            rejectUnauthorized: false, // Accept self-signed certificates
        };
    }

    pool = new Pool(poolConfig);
} else {
    const connectionString = getEnvVariable("DATABASE_URL");
    const sslRequired = getEnvVariable("DB_SSL_REQUIRED") === "true";

    const poolConfig: PoolConfig = {
        connectionString,
    };

    if (sslRequired) {
        poolConfig.ssl = {
            rejectUnauthorized: false,
        };
    }

    pool = new Pool(poolConfig);
}
const db = drizzle(pool, { schema });

export default db;

export const connect = async () => {
    try {
        await pool.connect();
        console.log("Database connection pool established successfully.");
    } catch (error) {
        console.error("Error connecting to the database:", error);
        throw error; // Re-throw the error to indicate connection failure
    }
};
