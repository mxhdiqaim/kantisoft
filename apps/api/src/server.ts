import "./config/instrument";
import * as Sentry from "@sentry/bun";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import path from "path";
import routes from "./routes";
import { getEnvVariable } from "./shared/utils";
import { initializeFirebase } from "./config/firebase-admin";
import { globalErrorHandler } from "./shared/middlewares/error.middleware";

export const app = express();

app.set("trust proxy", 1);

const ADMIN_APP = getEnvVariable("ADMIN_APP");
const APP_URL = getEnvVariable("APP_URL");
const LANDING_PAGE = getEnvVariable("LANDING_PAGE");
const NODE_ENV = getEnvVariable("NODE_ENV");

const URL =
    NODE_ENV === "development"
        ? [
              "http://localhost:3000",
              "http://localhost:3001",
              "http://localhost:3002",
          ]
        : [
              `https://${LANDING_PAGE}`,
              `https://${APP_URL}`,
              `https://${ADMIN_APP}`,
          ];

initializeFirebase();

const corsOptions = {
    origin: URL,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
};

app.use(cors(corsOptions));

app.use(morgan("dev"));

app.use(express.urlencoded({ extended: false }));

app.use(express.json({ limit: "5mb" }));

app.use((req, res, next) => {
    next();
});

app.use("/api/v1", routes);

app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
    const error = new Error(
        `Route not found: ${req.method} ${req.originalUrl}`,
    );

    res.status(404).json({
        message: error.message,
    });

    next(error);
});

Sentry.setupExpressErrorHandler(app);

app.use(globalErrorHandler);
