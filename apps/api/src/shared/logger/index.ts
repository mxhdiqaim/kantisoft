import pino from "pino";
import path from "path";
import { helperUtil } from "../utils";
import { requestContext } from "./context";

interface CustomPinoLogger extends pino.Logger {
    http: pino.LogFn;
    query: pino.LogFn;
}

class LoggerService {
    private readonly pinoInstance: CustomPinoLogger;
    private readonly isDevelopment: boolean = helperUtil.getEnvVariable("NODE_ENV") === "development";
    private readonly logDirectory: string = path.join(__dirname, "../../.log");

    constructor() {
        this.pinoInstance = this.initializePino();
    }

    private initializePino(): CustomPinoLogger {
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
            targets: this.isDevelopment
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
                              file: path.join(this.logDirectory, "error/error"),
                              frequency: "daily",
                              extension: ".log",
                              mkdir: true,
                          },
                      },
                      {
                          target: "pino-roll",
                          level: "trace",
                          options: {
                              file: path.join(this.logDirectory, "combined/combined"),
                              frequency: "daily",
                              extension: ".log",
                              mkdir: true,
                          },
                      },
                  ],
        });

        const instance = pino(
            {
                level: this.isDevelopment ? "trace" : "info",
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

        return instance as unknown as CustomPinoLogger;
    }

    public error(message: string, meta?: Record<string, unknown> | Error): void {
        if (meta instanceof Error) {
            this.pinoInstance.error({ err: meta }, message);
        } else {
            this.pinoInstance.error(meta || {}, message);
        }
    }

    public warn(message: string, meta?: Record<string, unknown>): void {
        this.pinoInstance.warn(meta || {}, message);
    }

    public info(message: string, meta?: Record<string, unknown>): void {
        this.pinoInstance.info(meta || {}, message);
    }

    public debug(message: string, meta?: Record<string, unknown>): void {
        this.pinoInstance.debug(meta || {}, message);
    }

    public http(message: string, meta?: Record<string, unknown>): void {
        this.pinoInstance.http(meta || {}, message);
    }

    public query(
        message: string,
        meta?: {
            sql?: string;
            executionTime?: number;
            parameters?: unknown[];
            [key: string]: unknown;
        },
    ): void {
        this.pinoInstance.query(meta || {}, message);
    }

    public getHttpLogStream() {
        return {
            write: (message: string) => {
                this.http(message.trim());
            },
        };
    }
}

// Export as a module-level singleton
export default new LoggerService();
