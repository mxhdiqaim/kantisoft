// import { createClient } from "redis";
// import { getEnvVariable } from "../utils";
// import { NODE_ENV } from "../db";
// import { readFileSync } from "fs";

// export let redisClient: ReturnType<typeof createClient>;

// if (NODE_ENV === "production") {
//     const redisHost = getEnvVariable("REDIS_HOST");
//     const redisPort = getEnvVariable("REDIS_PORT");
//
//     // Read password from a Docker secret file
//     const passwordFile = getEnvVariable("REDIS_PASSWORD_FILE");
//     const redisPassword = readFileSync(passwordFile, "utf8").trim();
//
//     const encodedPassword = encodeURIComponent(redisPassword);
//
//     redisClient = createClient({
//         url: `redis://:${encodedPassword}@${redisHost}:${redisPort}`,
//     });
//
//     redisClient.on("error", (err) => console.log("Redis Client Error", err));
// }

// export const connectRedis = async () => {
//     if (!redisClient) {
//         console.log("Redis is disabled for the current environment.");
//         return;
//     }
//     try {
//         await redisClient.connect();
//         console.log("Redis client connected successfully");
//     } catch (err) {
//         console.error("Could not connect to Redis", err);
//         process.exit(1);
//     }
// };
