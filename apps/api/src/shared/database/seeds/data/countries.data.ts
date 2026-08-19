import { InsertCountrySchemaT } from "../../schema";

export const countriesSeedData: Omit<InsertCountrySchemaT, "id" | "createdAt" | "updatedAt">[] = [
    {
        countryName: "Nigeria",
        countryCode: "NG",
        phoneCode: "+234",
        currency: "NGN",
        currencySymbol: "₦",
        flagEmoji: "🇳🇬",
    },
    {
        countryName: "United States",
        countryCode: "US",
        phoneCode: "+1",
        currency: "USD",
        currencySymbol: "$",
        flagEmoji: "🇺🇸",
    },
    {
        countryName: "United Kingdom",
        countryCode: "GB",
        phoneCode: "+44",
        currency: "GBP",
        currencySymbol: "£",
        flagEmoji: "🇬🇧",
    },
    {
        countryName: "Canada",
        countryCode: "CA",
        phoneCode: "+1",
        currency: "CAD",
        currencySymbol: "CA$",
        flagEmoji: "🇨🇦",
    },
];
