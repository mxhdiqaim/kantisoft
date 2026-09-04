import { rateLimit } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { NextFunction, Request, Response, RequestHandler } from "express";
import { createClient } from "redis";
import { helperUtil } from "../utils";
import logger from "../logger";
import { EnvironmentVariablesEnum } from "../interface"; // Adjust path if necessary

class RateLimiterMiddleware {
    private readonly NODE_ENV = helperUtil.getEnvVariable("NODE_ENV");
    private readonly REDIS_URL = helperUtil.getEnvVariable("REDIS_URL");

    public readonly redisClient: ReturnType<typeof createClient>;

    constructor() {
        this.redisClient = createClient({
            url: this.REDIS_URL,
        });

        // Add error listeners so it doesn't crash the Node process quietly
        this.redisClient.on("error", (err) => logger.error("Redis Rate Limiter Client Error:", err));
    }

    public async connect(): Promise<void> {
        if (this.NODE_ENV === EnvironmentVariablesEnum.PRODUCTION) {
            this.redisClient.connect();
            logger.info("Rate Limiter connected to Redis successfully.");
        }
    }

    public async disconnect(): Promise<void> {
        if (this.NODE_ENV === EnvironmentVariablesEnum.PRODUCTION && this.redisClient.isOpen) {
            this.redisClient.destroy();
            logger.info("Rate Limiter disconnected from Redis.");
        }
    }

    // The actual middleware generator
    public apply = (): RequestHandler => {
        if (this.NODE_ENV === EnvironmentVariablesEnum.PRODUCTION) {
            return rateLimit({
                windowMs: 60 * 1000,
                max: 100,
                standardHeaders: true,
                legacyHeaders: false,
                message: "Too many requests from this IP, please try again later.",
                store: new RedisStore({
                    sendCommand: (...args: string[]) => this.redisClient.sendCommand(args),
                }),
            });
        }

        // In development, return a pass-through middleware that does nothing.
        return (req: Request, res: Response, next: NextFunction) => next();
    };
}

export default new RateLimiterMiddleware();
