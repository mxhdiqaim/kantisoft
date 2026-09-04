import "./config/instrument";
import * as Sentry from "@sentry/bun";
import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";
import morgan from "morgan";
import path from "path";
import routesV1 from "./routes";
import { helperUtil } from "./shared/utils";
import logger from "./shared/logger";
import { requestContext } from "./shared/logger/context";
import { clerkMiddleware } from "@clerk/express";
import { errorMiddleware, rateLimiterMiddleware } from "./shared/middlewares";
import { UserRoleEnum } from "./modules/iam/interface";

class Server {
    private readonly ADMIN_APP = helperUtil.getEnvVariable("ADMIN_APP");
    private readonly APP_URL = helperUtil.getEnvVariable("APP_URL");
    private readonly LANDING_PAGE = helperUtil.getEnvVariable("LANDING_PAGE");
    private readonly NODE_ENV = helperUtil.getEnvVariable("NODE_ENV");

    public app: Application;

    constructor() {
        this.app = express();

        // The order of these initializations is critical
        this.configureServer();
        this.setupMiddlewares();
        this.initializeRoutes();
        this.setupErrorHandling();
    }

    private configureServer(): void {
        this.app.set("trust proxy", 1);
    }

    private getCorsOptions(): cors.CorsOptions {
        const allowedOrigins =
            this.NODE_ENV === "development"
                ? ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"]
                : [`https://${this.ADMIN_APP}`, `https://${this.APP_URL}`, `https://${this.LANDING_PAGE}`];

        return {
            origin: allowedOrigins,
            methods: ["GET", "HEAD", "POST", "PATCH", "PUT", "DELETE"],
            allowedHeaders: ["Content-Type", "Authorization"],
            credentials: true,
        };
    }

    private setupMiddlewares(): void {
        this.app.use(cors(this.getCorsOptions()));

        // Apply the class method
        this.app.use(rateLimiterMiddleware.apply());

        // Initialize Request Context (AsyncLocalStorage)
        this.app.use((req: Request, res: Response, next: NextFunction) => {
            const requestId = (req.headers["x-request-id"] as string) || crypto.randomUUID();

            // The businessId and locationId will be added later by the Clerk auth middleware.
            requestContext.run({ requestId, role: UserRoleEnum.GUEST, userId: "" }, () => {
                next();
            });
        });

        // Pipe HTTP Logs to Pino
        this.app.use(morgan("dev", { stream: logger.getHttpLogStream() }));

        // Webhook Bypass Logic
        this.app.use((req: Request, res: Response, next: NextFunction) => {
            if (req.originalUrl.includes("/webhook")) {
                return next();
            }

            // If it's NOT a webhook, run both JSON and URL-encoded parsers safely
            express.json({ limit: "5mb" })(req, res, (err) => {
                if (err) return next(err);
                express.urlencoded({ extended: false })(req, res, next);
            });
        });

        this.app.use(clerkMiddleware());
    }

    private initializeRoutes() {
        this.app.use("/api/v1", routesV1);
        this.app.use(express.static(path.join(__dirname, "public")));
    }

    private setupErrorHandling(): void {
        // 404 Catch-All
        this.app.use(errorMiddleware.notFoundHandler);

        // Sentry Error Handler (Must execute before your global error handler)
        Sentry.setupExpressErrorHandler(this.app);

        // Global Error Handler
        this.app.use(errorMiddleware.globalErrorHandler);
    }
}

// Export the initialized Express application instance.
export const app = new Server().app;
