import { Router } from "express";
import { TenantController } from "../controller";

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
    }
}

export default new TenantRoutes().router;
