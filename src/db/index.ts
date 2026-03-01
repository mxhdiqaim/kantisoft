import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, PoolConfig } from "pg";
import schema from "./schema";
import { getEnvVariable } from "../utils";

// Get the connection URL
const connectionString = getEnvVariable("DB_CONNECTION_STRING");
const sslRequired = getEnvVariable("DB_SSL_REQUIRED") === "true";

const poolConfig: PoolConfig = {
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
};

if (sslRequired) {
    poolConfig.ssl = { rejectUnauthorized: false };
}

export const pool = new Pool(poolConfig);

// Listener to catch background errors
pool.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
});

const db = drizzle(pool, { schema });
export default db;

export const connect = async () => {
    try {
        // Try to acquire a client to verify connectivity
        const client = await pool.connect();
        console.log("✅ Database connection pool established successfully.");
        client.release(); // Immediately release it back to the pool
    } catch (error) {
        console.error("❌ Error connecting to the database:", error);
        throw error;
    }
};
