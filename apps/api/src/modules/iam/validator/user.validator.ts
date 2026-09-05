import { z } from "zod";
import BaseValidator from "../../../shared/validator/base.validator";
import { UserRoleEnum } from "../interface";

class UserValidator extends BaseValidator {
    public inviteSchema = z.object({
        firstName: z.string().trim().min(2, "First name must be at least 2 characters."),
        lastName: z.string().trim().min(2, "Last name must be at least 2 characters."),
        email: z.email("Invalid email address format."),
        role: z.enum(UserRoleEnum).default(UserRoleEnum.GUEST),
        branchId: this.common.uuid,
        businessId: this.common.uuid.optional(),
        phoneNumber: z.string().trim().optional(),
    });
}

export default new UserValidator();
