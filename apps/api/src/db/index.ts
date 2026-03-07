import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { Pool } from "pg"; // Keep this for sessions
import schema from "./schema";
import { getEnvVariable } from "../utils";

const connectionString = getEnvVariable("DB_CONNECTION_STRING");
const sslRequired = getEnvVariable("DB_SSL_REQUIRED") === "true";

// Faster driver for Drizzle (Business Logic)
export const client = postgres(connectionString, {
    max: 10,
    ssl: sslRequired ? { rejectUnauthorized: false } : false,
    prepare: false,
});

// Standard Pool for Connect-PG-Simple (Session Logic)
// Note: We don't need a huge pool here as sessions are lightweight
export const pool = new Pool({
    connectionString,
    max: 2,
    ssl: sslRequired ? { rejectUnauthorized: false } : false,
});

const db = drizzle(client, { schema });
export default db;

// Updated health check
export const connect = async () => {
    try {
        await client`SELECT 1`; // Test the fast client
        await pool.query("SELECT 1"); // Test the session pool
        console.log("✅ All database connections established.");
    } catch (error) {
        console.error("❌ DB Connection Error:", error);
        throw error;
    }
};
