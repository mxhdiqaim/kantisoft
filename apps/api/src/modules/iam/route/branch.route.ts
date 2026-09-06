import { Router } from "express";
import { BranchController } from "../controller";
import systemMiddleware from "../../../shared/middlewares/system.middleware";
import { branchValidator } from "../validator";

class BranchRoutes {
    public readonly router: Router;
    private readonly controller: BranchController;

    constructor() {
        this.router = Router();
        this.controller = new BranchController();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get("/", this.controller.index);

        this.router.post(
            "/",
            systemMiddleware.validateRequestBody(branchValidator.createSchema),
            this.controller.create,
        );

        this.router.patch(
            "/:id",
            systemMiddleware.validateRequestBody(branchValidator.updateSchema, false),
            this.controller.update,
        );
    }
}

export default new BranchRoutes().router;
