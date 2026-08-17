import { Router } from "express";
import tenantRoute from "./tenant.route";

class IamRoutes {
    public readonly router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post(
            "/tenant",
            // AuthMiddleware.requireAuth,
            tenantRoute,
        );

        // this.router.post(
        //     "/locations",
        //     // AuthMiddleware.requireAuth,
        //     // AuthMiddleware.withTenantContext,
        //     LocationController.create,
        // );
        //
        // this.router.post(
        //     "/staff/invite",
        //     // AuthMiddleware.requireAuth,
        //     // AuthMiddleware.withTenantContext,
        //     UserController.inviteStaff,
        // );
    }
}

export default new IamRoutes().router;
