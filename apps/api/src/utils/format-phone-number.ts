import { parsePhoneNumberWithError } from "libphonenumber-js";

/**
 * Parses and validates a phone number, returning it in E.164 format.
 * Defaults to Nigeria (NG) if no country code is provided (e.g. 08012345678 -> +2348012345678)
 */
export const formatPhoneNumber = (
    phone: string,
    defaultCountry: "NG" = "NG",
): string | null => {
    try {
        const phoneNumber = parsePhoneNumberWithError(phone, defaultCountry);

        // Ensure the number is mathematically valid for that specific country
        if (!phoneNumber.isValid()) {
            return null;
        }

        return phoneNumber.format("E.164"); // Returns strictly e.g. +234...
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        // Catches errors like too short, invalid characters, etc.
        return null;
    }
};
