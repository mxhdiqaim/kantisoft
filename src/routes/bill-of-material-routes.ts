import Express from "express";
import * as controller from "../controllers/bill-of-materials-controller";

const router = Express.Router();

router.get("/:id/bom", controller.getBillOfMaterials);

export default router;
