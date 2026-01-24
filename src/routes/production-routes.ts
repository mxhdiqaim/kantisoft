import Express from "express";
import * as controller from "../controllers/production-controller";

const router = Express.Router();

router.get("/logs", controller.getProductionLogs);
router.get("/wastage/summary", controller.getWastageSummary);
router.get("/summary", controller.getProductionSummary);

router.post("/", controller.runProduction);
router.post("/wastage", controller.recordWastage);

export default router;
