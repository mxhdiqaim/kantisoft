import { Router } from "express";
import addressRoute from "./address.route";
import countryRoute from "./country.route";

class LocationRoutes {
    public readonly router: Router;

    constructor() {
        this.router = Router();
        this.routes();
    }

    private routes() {
        this.router.use("/address", addressRoute);

        this.router.use("/country", countryRoute);
    }
}

export default new LocationRoutes().router;
