import { isAxiosError } from "axios";

export interface ParsedApiError {
    message: string;
    statusCode?: number;
    // eslint-disable-next-line
    errors?: any[];
}

/**
 * Universally parses errors from Axios, Clerk, or standard JS.
 * Extracts the exact message thrown by the backend AppError class.
 */
export const parseApiError = (error: unknown, defaultMessage = "An unexpected error occurred."): ParsedApiError => {
    // Handle Backend API Errors
    if (isAxiosError(error)) {
        // No response means the server is down or user is offline
        if (!error.response) {
            return { message: "Network error. Please check your internet connection." };
        }

        const statusCode = error.response.status;
        const responseData = error.response.data;

        // Extract the message and errors array exactly as your AppError formats it
        if (responseData && typeof responseData === "object") {
            // eslint-disable-next-line
            const message = (responseData as any).message || defaultMessage;
            // eslint-disable-next-line
            const errors = (responseData as any).errors;

            return { message, statusCode, errors };
        }

        return { message: defaultMessage, statusCode };
    }

    // Handle Clerk Errors
    if (error && typeof error === "object" && "errors" in error) {
        // eslint-disable-next-line
        const clerkErrors = (error as any).errors;
        if (Array.isArray(clerkErrors) && clerkErrors.length > 0) {
            // Clerk often provides a 'longMessage' or 'message'
            return { message: clerkErrors[0].longMessage || clerkErrors[0].message || defaultMessage };
        }
    }

    // Handle Standard JavaScript Errors
    if (error instanceof Error) {
        return { message: error.message };
    }

    // Fallback for completely unknown errors
    return { message: defaultMessage };
};
