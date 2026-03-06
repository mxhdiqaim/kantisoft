import * as db from "./src/db";
import { app } from "./src/server";
import { getEnvVariable } from "./src/utils";
import { createRateLimiter } from "./src/middlewares/rate-limiter";

const PORT = parseInt(getEnvVariable("PORT"));

// Creating a server instance
// const server = http.createServer(app);

(async () => {
    // DB Connection
    await db
        .connect()
        .then(() => console.log("Database connection has been established"))
        .catch((err) =>
            console.error("Failed to connect to the database", err),
        );

    // Redis Connection
    // await connectRedis();

    // Apply rate limiter after Redis is connected
    app.use(createRateLimiter());

    // Replacing Bun.serve with app.listen as Express works natively in Bun
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server has been started and listening on port ${PORT}`);
    });
})();
