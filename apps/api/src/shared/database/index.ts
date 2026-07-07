import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { Pool } from "pg";
import schema from "../../db/schema";
import { getEnvVariable } from "../../utils";

const connectionString = getEnvVariable("DB_CONNECTION_STRING");
const sslRequired = getEnvVariable("DB_SSL_REQUIRED") === "true";

export const client = postgres(connectionString, {
    max: 10,
    ssl: sslRequired ? { rejectUnauthorized: false } : false,
    prepare: false,
});

export const pool = new Pool({
    connectionString,
    max: 2,
    ssl: sslRequired ? { rejectUnauthorized: false } : false,
});

const db = drizzle(client, { schema });
export default db;

export const connect = async () => {
    try {
        await client`SELECT 1`;
        await pool.query("SELECT 1");
        console.log("✅ All database connections established.");
    } catch (error) {
        console.error("❌ DB Connection Error:", error);
        throw error;
    }
};
