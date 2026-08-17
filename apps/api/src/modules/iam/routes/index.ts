import { Router } from "express";
import { authMiddleware } from "../../../shared/middlewares";
import tenantRoute from "./tenant.route";
import webhookRoute from "./webhook.route";

class IamRoutes {
    public readonly router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post("/tenant", authMiddleware.requireAuth, tenantRoute);

        this.router.use("/webhooks", webhookRoute);
    }
}

export default new IamRoutes().router;
