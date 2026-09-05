import { Router } from "express";
import { LocationController } from "../controller";
import AuthMiddleware from "../../../shared/middlewares/auth.middleware";

class LocationRoutes {
    public readonly router: Router;
    private readonly controller: LocationController;

    constructor() {
        this.router = Router();
        this.controller = new LocationController();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post(
            "/",
            AuthMiddleware.requireAuth,
            AuthMiddleware.withTenantContext, // Ensures the user has a tenant
            this.controller.create,
        );
    }
}

export default new LocationRoutes().router;
