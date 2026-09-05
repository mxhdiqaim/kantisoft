import { Request, Response, NextFunction } from "express";
import { helperUtil } from "../utils";
import { AppError } from "../errors/custom.error";

class ErrorMiddleware {
    private readonly SERVER_ERROR = 500;
    private readonly UNAUTHORIZED = 401;
    private readonly NOT_FOUND = 404;

    public notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
        const error = new AppError(`Route not found: ${req.method} ${req.originalUrl}`, this.NOT_FOUND);
        next(error);
    };

    // eslint-disable-next-line
    public globalErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
        const NODE_ENV = helperUtil.getEnvVariable("NODE_ENV") || "development";

        let statusCode = this.SERVER_ERROR;
        let message = "Something went wrong. Server Error!";

        // Handle custom AppErrors
        if (err instanceof AppError) {
            statusCode = err.statusCode;
            message = err.message;
        }
        // Catch potential Clerk/Third-party errors that aren't instances of AppError
        else if (err.message && err.message.includes("Authentication failed")) {
            statusCode = this.UNAUTHORIZED;
            message = err.message;
        }

        // Logging
        if (NODE_ENV === "development") {
            console.error(`\n🚨 [ERROR] [${req.method}] ${req.path} - Status: ${statusCode}`);
            console.error(`Message: ${err.message}`);
            if (err.stack) {
                console.error(`Stack Trace:\n${err.stack}\n`);
            }
        } else {
            if (statusCode === this.SERVER_ERROR) {
                console.error("CRITICAL UNHANDLED ERROR:", err);
            }
        }

        // Send JSON response
        return res.status(statusCode).json({
            type: statusCode,
            message: message,
            ...(NODE_ENV === "development" && { stack: err.stack }),
        });
    };
}

export default new ErrorMiddleware();
