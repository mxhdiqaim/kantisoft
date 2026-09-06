import { Router } from "express";
import { BusinessController } from "../controller";
import { businessMiddleware } from "../../../shared/middlewares";
import systemMiddleware from "../../../shared/middlewares/system.middleware";
import { businessValidator } from "../validator";

class BusinessRoutes {
    public readonly router: Router;
    private readonly controller: BusinessController;

    constructor() {
        this.router = Router();
        this.controller = new BusinessController();
        this.routes();
    }

    private routes() {
        this.router.post(
            "/",
            systemMiddleware.validateRequestBody(businessValidator.createSchema),
            this.controller.create,
        );

        this.router.use(businessMiddleware.validateBusinessOwnership);

        this.router.get("/:id", this.controller.get);

        this.router.patch(
            "/:id",
            systemMiddleware.validateRequestBody(businessValidator.updateSchema, false),
            this.controller.update,
        );
    }
}

export default new BusinessRoutes().router;
