import type {Period} from "@/types/order-types.ts";
import type {UserRoleType, UserType} from "@/types/user-types";
import type {ChipProps} from "@mui/material";
import {useEffect} from "react";
import {useLocation} from "react-router-dom";
import {format} from "date-fns";

// fixes scroll behaviour on route change
export const ScrollToTop = () => {
    const {pathname} = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
};

export const ngnFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "NGN",
});


/**
 * Formats a number as a currency string.
 * @param amount The numeric value to format.
 * @param currencyCode The ISO 4217 currency code (e.g. 'USD', 'EUR', 'NGN').
 * @param locale The locale for formatting (e.g. 'en-US', 'de-DE', 'ha-NG').
 * @returns The formatted currency string.
 */
export const formatCurrency = (amount: number, currencyCode: string = "NGN", locale: string = "ha-NG"): string => {
    // Check for invalid input
    if (isNaN(amount)) {
        return "Invalid Amount";
    }
    if (currencyCode.trim() === "") {
        return "Invalid Currency";
    }

    try {
        const formatter = new Intl.NumberFormat(locale, {
            style: "currency",
            currency: currencyCode,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

        return formatter.format(amount);
    } catch (error) {
        console.error(`Error formatting currency:`, error);
        return `${currencyCode} ${amount.toFixed(2)}`; // Fallback
    }
};

export const getTitle = (period: Period) => {
    switch (period) {
        case "today":
            return "Today";
        case "week":
            return "This Week";
        case "month":
            return "This Month";
        case "all-time":
            return "All Time";
        default:
            return "Sales History";
    }
};

/**
 * Returns a specific MUI colour for a user role to be used in Chips.
 * @param {UserRoleType} role - The role of the user.
 * @returns {ChipProps['color']} A MUI colour prop for the Chip component.
 */
export const getRoleChipColor = (role: UserRoleType): ChipProps["color"] => {
    const colors: Record<UserRoleType, ChipProps["color"]> = {
        manager: "secondary",
        admin: "primary",
        user: "info",
        guest: "default",
    };

    return colors[role] || "default";
};

export const getActionColor = (action: string) => {
    const lowerAction = action.toLowerCase();

    if (lowerAction.includes("create") || lowerAction.includes("login") || lowerAction.includes("viewed"))
        return "success";
    if (lowerAction.includes("update") || lowerAction.includes("password_changed")) return "warning";
    if (lowerAction.includes("delete") || lowerAction.includes("cancelled")) return "error";
    if (lowerAction.includes("failed") || lowerAction.includes("error")) return "error";
    return "default";
};


// Function to safely parse user data from localStorage
export const getUserDataFromStorage = (): UserType | null => {
    const storedUser = localStorage.getItem("userData");
    if (storedUser) {
        try {
            return JSON.parse(storedUser) as UserType;
        } catch (error) {
            console.error("Failed to parse user data from localStorage", error);
            localStorage.removeItem("userData");
            return null;
        }
    }
    return null;
};

// Function to safely get token expiration time from localStorage
export const getTokenExpFromStorage = (): number | null => {
    const storedTokenExp = localStorage.getItem("tokenExp");
    if (storedTokenExp) {
        const exp = parseInt(storedTokenExp, 10);

        return isNaN(exp) ? null : exp;
    }
    return null;
};

export const getEnvVariable = (key: string): string => {
    const value = import.meta.env[key];

    if (!value) {
        throw new Error(`Environment variable is missing: ${key}`);
    }

    return value;
};

// convert snake case to Title Case
export const snakeCaseToTitleCase = (str: string) => {
    if (!str) return "";
    return str
        .toLowerCase()
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
};

// convert camel case to Title Case
export const camelCaseToTitleCase = (str: string) => {
    if (!str) return "";

    // Insert a space before all capital letters and trim the leading space
    const result = str.replace(/([A-Z])/g, " $1").trim();

    // Capitalise the first letter of the resulting string
    return result.charAt(0).toUpperCase() + result.slice(1);
};

/**
 * Custom date formatter for specific display variants.
 * @param date - Date object, string, or number
 * @param variant - 'short' (21 Dec, 2025) or 'long' (21 December 2025)
 */
export const formatDateCustom = (
    date: Date | string | number | null | undefined,
    variant: "short" | "long" = "short",
): string => {
    if (!date) return "";

    const dateObj = new Date(date);

    // d = Day (21)
    // MMM = Short Month (Dec) | MMMM = Long Month (December)
    // yyyy = Year (2025)
    const pattern = variant === "short" ? "d MMM, yyyy" : "d MMMM, yyyy";

    return format(dateObj, pattern);
};

export const a11yProps = (index: number) => {
    return {
        id: `simple-tab-${index}`,
        "aria-controls": `simple-tabpanel-${index}`,
    };
};

export const formatNumber = (value: number): string => {
    return new Intl.NumberFormat().format(value);
};

