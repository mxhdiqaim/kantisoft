import { app } from "./src/server";
import { getEnvVariable } from "./src/shared/utils";
import { createRateLimiter } from "./src/shared/middlewares/rate-limiter";
import logger from "./src/shared/logger";
import { disconnect, connect } from "./src/shared/database";

interface SystemError extends Error {
    code?: string;
}

const PORT = parseInt(getEnvVariable("PORT"));

(async () => {
    try {
        // Establish DB Connection
        await connect();

        app.use(createRateLimiter());

        // Start the Server
        const server = app.listen(PORT, "0.0.0.0", () => {
            logger.info(
                `Server has been started and listening on port ${PORT}`,
            );
        });

        let isShuttingDown = false;

        const gracefulShutdown = async (signal: string) => {
            // If a shutdown is already in progress, ignore duplicate signals
            if (isShuttingDown) {
                return;
            }

            isShuttingDown = true;
            logger.info(`${signal} received. Initiating graceful shutdown...`);

            try {
                // Stop accepting new HTTP connections
                await new Promise<void>((resolve, reject) => {
                    server.close((err) => {
                        const systemError = err as SystemError;

                        // If it's already closed, we don't care, just resolve
                        if (
                            systemError &&
                            systemError.code !== "ERR_SERVER_NOT_RUNNING"
                        ) {
                            return reject(systemError);
                        }

                        logger.info(
                            "Express server stopped accepting new connections.",
                        );
                        resolve();
                    });
                });

                // Safely close database connections
                await disconnect();

                logger.info("Graceful shutdown completed successfully.");
                process.exit(0);
            } catch (error) {
                logger.error("Error during graceful shutdown:", error as Error);
                process.exit(1);
            }
        };

        // Ensure your event listeners pass the signal name
        process.on("SIGINT", () => gracefulShutdown("SIGINT")); // Ctrl+C in terminal
        process.on("SIGTERM", () => gracefulShutdown("SIGTERM")); // Docker/K8s termination
    } catch (error) {
        logger.error("Failed to start application", error as Error);
        process.exit(1);
    }
})();
