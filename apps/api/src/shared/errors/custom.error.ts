/* eslint-disable @typescript-eslint/no-explicit-any */

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly errors?: any[];

    constructor(message: string, statusCode: number, errors?: any[]) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.errors = errors;

        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

export class BadRequestError extends AppError {
    constructor(message = "Bad Request", errors?: any[]) {
        super(message, 400, errors);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = "Authentication required. Please sign in.") {
        super(message, 401);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = "Access denied. You do not have permission.") {
        super(message, 403);
    }
}

export class NotFoundError extends AppError {
    constructor(message = "The requested resource could not be found.") {
        super(message, 404);
    }
}

export class ConflictError extends AppError {
    constructor(message = "A conflict occurred with the current state of the resource.") {
        super(message, 409);
    }
}
