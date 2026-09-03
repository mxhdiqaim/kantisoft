import { Router } from "express";
import { authMiddleware } from "../../../shared/middlewares";
import businessRoute from "./business.route";
import webhookRoute from "./webhook.route";
import locationRoute from "./location.route";
import userRoute from "./user.route";

class IamRoutes {
    public readonly router: Router;

    constructor() {
        this.router = Router();
        this.routes();
    }

    private routes() {
        this.router.use("/webhooks", webhookRoute);

        this.router.use(authMiddleware.requireAuth);

        this.router.use("/business", businessRoute);

        this.router.use(authMiddleware.validateAccess);

        this.router.use("/locations", locationRoute);

        this.router.use("/users", userRoute);
    }
}

export default new IamRoutes().router;
