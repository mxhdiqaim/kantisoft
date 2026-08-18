import { Router } from "express";
import { UserController } from "../controller";
import AuthMiddleware from "../../../shared/middlewares/auth.middleware";

class UserRoutes {
    public readonly router: Router;
    private readonly controller: UserController;

    constructor() {
        this.router = Router();
        this.controller = new UserController();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post(
            "/invite",
            AuthMiddleware.requireAuth,
            AuthMiddleware.withTenantContext,
            this.controller.inviteStaff,
        );
    }
}

export default new UserRoutes().router;
