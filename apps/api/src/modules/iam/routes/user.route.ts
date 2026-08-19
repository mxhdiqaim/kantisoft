import { Router } from "express";
import { UserController } from "../controller";

class UserRoutes {
    public readonly router: Router;
    private readonly controller: UserController;

    constructor() {
        this.router = Router();
        this.controller = new UserController();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post("/invite", this.controller.inviteStaff);
    }
}

export default new UserRoutes().router;
