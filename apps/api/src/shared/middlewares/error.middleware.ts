import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { getEnvVariable } from "../utils";
import { AppError } from "../errors/custom.error";

export const globalErrorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const NODE_ENV = getEnvVariable("NODE_ENV") || "development";

    let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    let message = "Something went wrong. Server Error!";

    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
    }

    if (NODE_ENV === "development") {
        console.error(
            `\n🚨 [ERROR] [${req.method}] ${req.path} - Status: ${statusCode}`,
        );
        console.error(`Message: ${err.message}`);
        if (err.stack) {
            console.error(`Stack Trace:\n${err.stack}\n`);
        }
    } else {
        if (statusCode === StatusCodes.INTERNAL_SERVER_ERROR) {
            console.error("CRITICAL UNHANDLED ERROR:", err);
        }
    }

    return res.status(statusCode).json({
        type: statusCode,
        message: message,
        ...(NODE_ENV === "development" && { stack: err.stack }),
    });
};
