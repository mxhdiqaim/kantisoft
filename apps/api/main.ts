import * as db from "./src/shared/database";
import { app } from "./src/server";
import { getEnvVariable } from "./src/shared/utils";
import { createRateLimiter } from "./src/shared/middlewares/rate-limiter";

const PORT = parseInt(getEnvVariable("PORT"));

(async () => {
    // DB Connection
    await db
        .connect()
        .then(() => console.log("Database connection has been established"))
        .catch((err) =>
            console.error("Failed to connect to the database", err),
        );

    app.use(createRateLimiter());

    // Replacing Bun.serve with app.listen as Express works natively in Bun
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server has been started and listening on port ${PORT}`);
    });
})();
