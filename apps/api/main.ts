import "newrelic";
import { Server } from "http";
import { app } from "./src/server";
import { getEnvVariable } from "./src/shared/utils";
import { createRateLimiter } from "./src/shared/middlewares/rate-limiter";
import logger from "./src/shared/logger";
import { database } from "./src/shared/database";

interface SystemError extends Error {
    code?: string;
}

class Application {
    private port: number;
    private server?: Server;
    private isShuttingDown: boolean = false;

    constructor() {
        this.port = parseInt(getEnvVariable("PORT") || "3000", 10);
    }

    public async start(): Promise<void> {
        try {
            // Establish Database Connections
            await database.connect();

            // Rate Limiter Middlewares
            app.use(createRateLimiter());

            // Start the Express Server
            this.server = app.listen(this.port, "0.0.0.0", () => {
                logger.info(`Server has been started and listening on port ${this.port}`);
            });

            // Initialize Process Listeners
            this.setupGracefulShutdown();
        } catch (error) {
            logger.error("Failed to start application", error as Error);
            process.exit(1);
        }
    }

    private setupGracefulShutdown(): void {
        process.on("SIGINT", () => this.gracefulShutdown("SIGINT")); // Ctrl+C in terminal
        process.on("SIGTERM", () => this.gracefulShutdown("SIGTERM")); // Docker/K8s termination

        // Catch unhandled promises
        process.on("unhandledRejection", (reason, promise) => {
            logger.error("Unhandled Rejection at:", { promise, reason });
        });
    }

    private async gracefulShutdown(signal: string): Promise<void> {
        // Prevent duplicate shutdown triggers
        if (this.isShuttingDown) {
            return;
        }

        this.isShuttingDown = true;
        logger.info(`${signal} received. Initiating graceful shutdown...`);

        try {
            // Stop accepting new HTTP connections
            if (this.server) {
                await new Promise<void>((resolve, reject) => {
                    this.server!.close((error) => {
                        const systemError = error as SystemError;

                        // If it's already closed, resolve it
                        if (systemError && systemError.code !== "ERR_SERVER_NOT_RUNNING") {
                            return reject(systemError);
                        }

                        logger.info("Express server stopped accepting new connections.");
                        resolve();
                    });
                });
            }

            // Safely close database connections
            await database.disconnect();

            logger.info("Graceful shutdown completed successfully.");
            process.exit(0);
        } catch (error) {
            logger.error("Error during graceful shutdown:", error as Error);
            process.exit(1);
        }
    }
}

const application = new Application();
application.start();
