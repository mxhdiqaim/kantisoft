import { Router } from "express";
import iamRoutes from "../modules/iam/routes";

class AppRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get("/health", (req, res) => {
            res.status(200).json({
                status: "ok",
                message: "API is up and running",
                timestamp: new Date().toISOString(),
            });
        });

        // Mount routers to API version prefixes
        this.router.use("/iam", iamRoutes);
        // this.router.use("/catalog", catalogRoutes);
        // this.router.use("/sales", salesRoutes);
    }
}

export default new AppRouter().router;
