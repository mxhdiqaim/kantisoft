import Express from "express";
import * as controller from "../controllers/production-controller";

const router = Express.Router();

router.get("/summary", controller.getProductionSummary);
router.post("/", controller.runProduction);

export default router;
