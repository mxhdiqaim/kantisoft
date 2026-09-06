import express, { Router } from "express";
import { WebhookController } from "../controller";

class WebhookRoutes {
    public readonly router: Router;
    private readonly controller: WebhookController;

    constructor() {
        this.router = Router();
        this.controller = new WebhookController();
        this.routes();
    }

    private routes() {
        this.router.post("/clerk", express.raw({ type: "application/json" }), this.controller.handleClerkWebhook);
    }
}

export default new WebhookRoutes().router;
