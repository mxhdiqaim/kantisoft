import { StatusCodes } from "http-status-codes";

// Base Error
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;

        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

export class BadRequestError extends AppError {
    constructor(message = "Bad Request") {
        super(message, StatusCodes.BAD_REQUEST);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = "Authentication required. Please sign in.") {
        super(message, StatusCodes.UNAUTHORIZED);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = "Access denied. You do not have permission.") {
        super(message, StatusCodes.FORBIDDEN);
    }
}

export class NotFoundError extends AppError {
    constructor(message = "The requested resource could not be found.") {
        super(message, StatusCodes.NOT_FOUND);
    }
}

export class ConflictError extends AppError {
    constructor(
        message = "A conflict occurred with the current state of the resource.",
    ) {
        super(message, StatusCodes.CONFLICT);
    }
}
