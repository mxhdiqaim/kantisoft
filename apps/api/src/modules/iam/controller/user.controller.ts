import { Request, Response, NextFunction } from "express";
import { userService } from "../service";
import { requestContext } from "../../../shared/logger/context";

export default class UserController {
    public inviteStaff = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { body } = req;

            const context = requestContext.getStore();
            const businessId = context?.businessId;

            const invitation = await userService.inviteUser({
                ...body,
                businessId: String(businessId),
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
