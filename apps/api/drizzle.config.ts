import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";
import { helperUtil } from "./src/shared/utils";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const connectionString = helperUtil.getEnvVariable("DB_CONNECTION_STRING");
const sslRequired = helperUtil.getEnvVariable("DB_SSL_REQUIRED") === "true";
const dbUrl = new URL(connectionString);

const dbCredentials = {
    host: dbUrl.hostname,
    port: Number(dbUrl.port),
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.replace(/^\//, ""),
    ssl: sslRequired,
};

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/shared/database/schema.database.ts",
    out: "./migrations",
    dbCredentials: dbCredentials,
    verbose: true,
    strict: true,
});
