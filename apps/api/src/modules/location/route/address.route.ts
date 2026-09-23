import { Router } from "express";
import { AddressController } from "../controller";

class AddressRoute {
    public readonly router: Router;

    private readonly controller: AddressController;

    constructor() {
        this.router = Router();
        this.controller = new AddressController();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get("/", this.controller.index);
    }
}

export default new AddressRoute().router;
