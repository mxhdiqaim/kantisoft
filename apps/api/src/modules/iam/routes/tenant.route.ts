import { Router } from "express";
import { TenantController } from "../controller";
import { tenantMiddleware } from "../../../shared/middlewares";
import systemMiddleware from "../../../shared/middlewares/system.middleware";
import { tenantValidator } from "../validator";

class TenantRoutes {
    public readonly router: Router;
    private readonly controller: TenantController;

    constructor() {
        this.router = Router();
        this.controller = new TenantController();
        this.routes();
    }

    private routes() {
        this.router.post(
            "/",
            systemMiddleware.validateRequestBody(tenantValidator.createSchema),
            this.controller.create,
        );

        this.router.use(tenantMiddleware.validateTenantOwnership);

        this.router.patch(
            "/:id",
            systemMiddleware.validateRequestBody(tenantValidator.updateSchema, false),
            this.controller.update,
        );
    }
}

export default new TenantRoutes().router;
