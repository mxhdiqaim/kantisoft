import Express from "express";
import * as controller from "../../controllers/raw-material-controller/raw-material-inventory-controller";

const router = Express.Router();

router.get("/", controller.getAllRawMaterialInventory);
router.get("/:id", controller.getCurrentRawMaterialInventoryStock);
router.patch("/:id", controller.updateRawMaterialInventoryRecord);
router.post("/create", controller.createRawMaterialInventoryRecord);
router.post("/:id/stock-in", controller.addStockToRawMaterialInventory);

export default router;
