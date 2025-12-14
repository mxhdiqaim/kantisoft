import express from "express";
import * as controller from "../../controllers/raw-material-controller";
import rawMaterialInventory from "./raw-material-inventory-routes";
import rawMaterialStockTransaction from "./raw-material-stock-transaction-routes";

const router = express.Router();

router.get("/", controller.getAllRawMaterial);
router.get("/:id", controller.getSingleRawMaterial);
router.post("/create", controller.createRawMaterial);
router.patch("/:id", controller.updateRawMaterial);
router.delete("/:id", controller.deleteRawMaterial);

// Raw Material Inventory routes
router.use("/inventory", rawMaterialInventory);

// Raw Material Stock Transaction routes
router.use("/transactions", rawMaterialStockTransaction);

export default router;
