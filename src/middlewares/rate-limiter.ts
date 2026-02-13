import { rateLimit } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { NextFunction, Request, Response } from "express";
import { createClient } from "redis";
import { getEnvVariable } from "../utils";

export let redisClient: ReturnType<typeof createClient>;
const NODE_ENV = getEnvVariable("NODE_ENV");

export const createRateLimiter = () => {
    if (NODE_ENV === "production" && redisClient) {
        return rateLimit({
            windowMs: 60 * 1000, // 1 minute
            max: 100, // limit each IP to 100 requests per windowMs
            standardHeaders: true, // Return rate limit info in the headers
            legacyHeaders: false, // Disable the X-RateLimit headers
            message: "Too many requests from this IP, please try again later.",
            store: new RedisStore({
                sendCommand: (...args: string[]) =>
                    redisClient.sendCommand(args),
            }),
        });
    }
    // In development, return a pass-through middleware that does nothing.
    return (req: Request, res: Response, next: NextFunction) => next();
};
