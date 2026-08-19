import { z, ZodSchema } from "zod";

class BaseValidator {
    // Shared Regex Patterns
    protected patterns = {
        password:
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~])[A-Za-z\d!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]{8,}$/,
        phoneNumber: /^\+\d{1,3}-\d{4,15}$/,
        twentyFourHourTime: /^([01]\d|2[0-3]):([0-5]\d)$/,
        yearMonthDate: /^\d{4}-\d{2}-\d{2}$/,
    };

    // Reusable Zod fields to prevent duplicating common validations
    protected common = {
        uuid: z.uuid("Invalid UUID format."),
        password: z
            .string()
            .regex(
                this.patterns.password,
                "Password must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character.",
            ),
        phoneNumber: z.string().regex(this.patterns.phoneNumber, "Invalid phone number format."),
        date: z.string().regex(this.patterns.yearMonthDate, "Date must be in YYYY-MM-DD format."),
        time: z.string().regex(this.patterns.twentyFourHourTime, "Time must be in HH:MM format."),

        nullableString: z.string().nullable().or(z.literal("")),
    };

    /**
     * If we ever need to validate data outside of our Express system.middleware.ts
     */
    protected validate = <T>(schema: ZodSchema<T>, payload: unknown): T => {
        return schema.parse(payload);
    };
}

export default BaseValidator;
