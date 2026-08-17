import "newrelic";
import { Server } from "http";
import { app } from "./src/server";
import { helperUtil } from "./src/shared/utils";
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
        this.port = parseInt(helperUtil.getEnvVariable("PORT") || "7789", 10);
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
            this.shutdownSetup();
        } catch (error) {
            logger.error("Failed to start application", error as Error);
            process.exit(1);
        }
    }

    private shutdownSetup(): void {
        process.on("SIGINT", () => this.shutdown("SIGINT")); // Ctrl+C in terminal
        process.on("SIGTERM", () => this.shutdown("SIGTERM")); // Docker/K8s termination

        // Catch unhandled promises
        process.on("unhandledRejection", (reason, promise) => {
            logger.error("Unhandled Rejection at:", { promise, reason });
        });
    }

    private async shutdown(signal: string): Promise<void> {
        // Prevent duplicate shutdown triggers
        if (this.isShuttingDown) {
            return;
        }

        this.isShuttingDown = true;
        logger.info(`${signal} received. Initiating shutdown...`);

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

            logger.info("Shutdown completed successfully.");
            process.exit(0);
        } catch (error) {
            logger.error("Error during shutdown:", error as Error);
            process.exit(1);
        }
    }
}

const application = new Application();
application.start().then(() => console.log("Server started successfully"));
