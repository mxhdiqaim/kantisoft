import Express from "express";
import * as controller from "../controllers/production-controller";

const router = Express.Router();

// Production Run Endpoint
router.post("/", controller.runProduction);

export default router;
