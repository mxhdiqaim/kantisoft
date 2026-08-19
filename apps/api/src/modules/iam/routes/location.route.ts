import { Router } from "express";
import { LocationController } from "../controller";

class LocationRoutes {
    public readonly router: Router;
    private readonly controller: LocationController;

    constructor() {
        this.router = Router();
        this.controller = new LocationController();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post("/", this.controller.create);
    }
}

export default new LocationRoutes().router;
