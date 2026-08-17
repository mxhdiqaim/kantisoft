import { Router } from "express";
import { TenantController } from "../controller";

class TenantRoutes extends TenantController {
    public readonly router: Router;

    constructor() {
        super();
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post("/tenant", this.create);
    }
}

export default new TenantRoutes().router;
