import { z } from "zod";
import BaseValidator from "../../../shared/validator/base.validator";

class BranchValidator extends BaseValidator {
    public createSchema = z.object({
        name: z.string().trim().min(2, "Branch name must be at least 2 characters."),
        addressId: this.common.uuid.optional(),
    });

    public updateSchema = z.object({
        name: z.string().trim().min(2, "Branch name must be at least 2 characters.").optional(),
        addressId: this.common.uuid.optional(),
    });
}

export default new BranchValidator();
