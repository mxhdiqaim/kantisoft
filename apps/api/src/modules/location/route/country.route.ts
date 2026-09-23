import { Router } from "express";
import { CountryController } from "../controller";

class CountryRoute {
    public readonly router: Router;
    private readonly controller: CountryController;

    constructor() {
        this.router = Router();
        this.controller = new CountryController();
        this.initializeRoutes();
    }

    private initializeRoutes() {}
}

export default new CountryRoute().router;
