import { Request, Response, NextFunction } from "express";
import { userService } from "../service";
import { requestContext } from "../../../shared/logger/context";
import { BadRequestError, UnauthorizedError } from "../../../shared/errors/custom.error";

export default class UserController {
    public inviteStaff = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { firstName, lastName, email, phone, role, locationId } = req.body;

            const context = requestContext.getStore();
            const businessId = context?.businessId;

            if (!businessId) {
                throw new UnauthorizedError("Business context missing.");
            }

            // Validate all required fields
            if (!firstName || !lastName || !email || !role || !locationId) {
                throw new BadRequestError("First name, last name, email, role, and locationId are required.");
            }

            const invitation = await userService.inviteUser({
                firstName,
                lastName,
                businessId,
                email,
                role,
                locationId,
                phone,
            });

            return res.status(200).json({
                message: "Staff invited successfully.",
                data: invitation,
            });
        } catch (error) {
            next(error);
        }
    };
}
