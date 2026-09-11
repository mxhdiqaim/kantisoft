import { Router } from "express";
import { UserController } from "../controller";
import systemMiddleware from "../../../shared/middlewares/system.middleware";
import { userValidator } from "../validator";

class UserRoutes {
    public readonly router: Router;
    private readonly controller: UserController;

    constructor() {
        this.router = Router();
        this.controller = new UserController();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get("/", this.controller.index);

        this.router.get("/me", this.controller.getMe);

        this.router.post(
            "/invite",
            systemMiddleware.validateRequestBody(userValidator.inviteSchema),
            this.controller.inviteStaff,
        );
    }
}

export default new UserRoutes().router;
