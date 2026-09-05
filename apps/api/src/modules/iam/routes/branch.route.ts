import { Router } from "express";
import { BranchController } from "../controller";

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

        this.router.post("/", this.controller.create);

        this.router.patch("/:id", this.controller.update);
    }
}

export default new BranchRoutes().router;
