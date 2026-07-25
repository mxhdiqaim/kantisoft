import pino from "pino";
import path from "path";
import { getEnvVariable } from "../utils";
import { requestContext } from "./context";

const NODE_ENV = getEnvVariable("NODE_ENV");
const isDevelopment = NODE_ENV === "development";
const logDirectory = path.join(__dirname, "../../.log");

const customLevels = {
    fatal: 60,
    error: 50,
    warn: 40,
    info: 30,
    http: 25,
    query: 24,
    debug: 20,
    trace: 10,
};

const transports = pino.transport({
    targets: isDevelopment
        ? [
              {
                  target: "pino-pretty",
                  level: "trace",
                  options: { colorize: true, translateTime: "SYS:standard" },
              },
          ]
        : [
              {
                  target: "pino-roll",
                  level: "error",
                  options: {
                      file: path.join(logDirectory, "error/error"),
                      frequency: "daily",
                      extension: ".log",
                      mkdir: true,
                  },
              },
              {
                  target: "pino-roll",
                  level: "trace",
                  options: {
                      file: path.join(logDirectory, "combined/combined"),
                      frequency: "daily",
                      extension: ".log",
                      mkdir: true,
                  },
              },
          ],
});

const pinoInstance = pino(
    {
        level: isDevelopment ? "trace" : "info",
        customLevels,
        useOnlyCustomLevels: true,
        mixin() {
            const context = requestContext.getStore();
            return context
                ? {
                      requestId: context.requestId,
                      tenantId: context.tenantId,
                      locationId: context.locationId,
                  }
                : {};
        },
    },
    transports,
);

class Logger {
    public error(
        message: string,
        meta?: Record<string, unknown> | Error,
    ): void {
        if (meta instanceof Error) {
            pinoInstance.error({ err: meta }, message);
        } else {
            pinoInstance.error(meta || {}, message);
        }
    }

    public warn(message: string, meta?: Record<string, unknown>): void {
        pinoInstance.warn(meta || {}, message);
    }

    public info(message: string, meta?: Record<string, unknown>): void {
        pinoInstance.info(meta || {}, message);
    }

    public debug(message: string, meta?: Record<string, unknown>): void {
        pinoInstance.debug(meta || {}, message);
    }

    public http(message: string, meta?: Record<string, unknown>): void {
        pinoInstance.http(meta || {}, message);
    }

    public query(
        message: string,
        meta?: {
            sql?: string;
            executionTime?: number;
            parameters?: any[];
            [key: string]: any;
        },
    ): void {
        pinoInstance.query(meta || {}, message);
    }

    public getHttpLogStream() {
        return {
            write: (message: string) => {
                this.http(message.trim());
            },
        };
    }
}

export default new Logger();
