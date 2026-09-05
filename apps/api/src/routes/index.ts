import { Router } from "express";
import { iamRoutes } from "../modules/iam";
import systemMiddleware from "../shared/middlewares/system.middleware";

class AppRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();
        this.routes();
    }

    private routes() {
        this.router.get("/health", (req, res) => {
            res.status(200).json({
                status: "ok",
                message: "API is up and running",
                timestamp: new Date().toISOString(),
            });
        });

        this.router.use(systemMiddleware.formatRequestQuery);

        this.router.use("/iam", iamRoutes);
        // this.router.use("/catalog", catalogRoutes);
        // this.router.use("/sales", salesRoutes);
    }
}

export default new AppRouter().router;
