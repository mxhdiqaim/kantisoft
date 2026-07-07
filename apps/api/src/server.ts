import "./config/instrument";
import * as Sentry from "@sentry/bun";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import path from "path";
import routes from "./routes";
import { getEnvVariable } from "./shared/utils";
import { initializeFirebase } from "./config/firebase-admin";

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

// CORS setup
app.use(cors(corsOptions));

/** Logging */
app.use(morgan("dev"));

/** Parse the request */
app.use(express.urlencoded({ extended: false }));

/** Takes care of JSON data */
app.use(express.json({ limit: "5mb" }));

/** RULES OF OUR API */
app.use((req, res, next) => {
    next();
});

/** Routes */
app.use("/api/v1", routes);

app.use(express.static(path.join(__dirname, "public")));

// Sentry Error Handler
Sentry.setupExpressErrorHandler(app);

/** Error handling */
app.use((req, res, next) => {
    const error = new Error("not found");

    res.status(404).json({
        message: error.message,
    });

    next(error);
});

/** Server */
// export default http.createServer(app);
