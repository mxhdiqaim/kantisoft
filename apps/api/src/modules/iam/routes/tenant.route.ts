import { Router } from "express";
import { TenantController } from "../controller";
import { tenantMiddleware } from "../../../shared/middlewares";

class TenantRoutes {
    public readonly router: Router;
    private readonly controller: TenantController;

    constructor() {
        this.router = Router();
        this.controller = new TenantController();
        this.routes();
    }

    private routes() {
        this.router.post("/", this.controller.create);

        this.router.use(tenantMiddleware.validateTenantOwnership);
    }
}

export default new TenantRoutes().router;
