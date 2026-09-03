import { z } from "zod";
import BaseValidator from "../../../shared/validator/base.validator";

class BusinessValidator extends BaseValidator {
    public createSchema = z.object({
        businessName: z.string().trim().min(2, "Business name must be at least 2 characters."),
        countryId: z.uuid("Invalid country ID format."),
        description: z.string().trim().optional(),
        teamSize: z.string("Team size must be a number string.").trim().optional(),
        companyRegistrationNumber: z.string().trim().optional(),
        taxOrVatId: z.string().trim().optional(),
        logoUrl: z.url("Invalid logo URL format.").optional().or(z.literal("")),
        addressId: this.common.uuid.optional(),
    });

    public updateSchema = z.object({
        businessName: z.string().trim().min(2, "Business name must be at least 2 characters.").optional(),
        countryId: z.string().uuid("Invalid country ID format.").optional(),
        description: z.string().trim().optional(),
        teamSize: z.string().trim().optional(),
        companyRegistrationNumber: z.string().trim().optional(),
        taxOrVatId: z.string().trim().optional(),
        logoUrl: z.url("Invalid logo URL format.").optional().or(z.literal("")),
        addressId: this.common.uuid.optional(),
    });
}

export default new BusinessValidator();
