import express from "express";
import * as controller from "../../controllers/raw-material-controller";
import rawMaterialInventory from "./raw-material-inventory-routes";
import rawMaterialStockTransaction from "./raw-material-stock-transaction-routes";
import { isAuthorized } from "../../middlewares/is-authorised-middleware";
import { UserRoleEnum } from "../../types/enums";

const router = express.Router();

// Raw Material Inventory routes
router.use(
    "/inventory",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    rawMaterialInventory,
);

// Raw Material Stock Transaction routes
router.use(
    "/transactions",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    rawMaterialStockTransaction,
);

router.get(
    "/",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    controller.getAllRawMaterial,
);
router.get(
    "/deleted",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    controller.getDeletedRawMaterials,
);
router.get(
    "/:id",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    controller.getSingleRawMaterial,
);
router.post(
    "/create",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    controller.createRawMaterial,
);
router.patch(
    "/:id",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    controller.updateRawMaterial,
);
router.patch(
    "/:id/recover",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    controller.recoverRawMaterial,
);
router.delete(
    "/:id",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    controller.deleteRawMaterial,
);

export default router;
