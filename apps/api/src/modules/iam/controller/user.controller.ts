import { Request, Response, NextFunction } from "express";
import { userService } from "../service";
import { requestContext } from "../../../shared/logger/context";

export default class UserController {
    public static async inviteStaff(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, firstName, lastName, phone, role, assignedLocationIds } = req.body;

            const context = requestContext.getStore();
            const tenantId = context?.tenantId;

            if (!tenantId) {
                return res.status(403).json({ error: "Tenant context is missing." });
            }

            // Ensure they aren't inviting another owner (only one owner per business for now)
            if (role === "owner") {
                return res.status(403).json({ error: "Cannot invite additional owners." });
            }

            const newUser = await userService.inviteUser(
                {
                    email,
                    firstName,
                    lastName,
                    phone,
                    role,
                    tenantId,
                },
                assignedLocationIds || [],
            );

            return res.status(201).json({
                message: "Staff invited successfully.",
                data: newUser,
            });
        } catch (error) {
            next(error);
        }
    }
}
