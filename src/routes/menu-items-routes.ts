import express from "express";
import * as controller from "../controllers/menu-items-controller";
import * as bomController from "../controllers/bill-of-materials-controller";
import { isAuthorized } from "../middlewares/is-authorised-middleware";
import { UserRoleEnum } from "../types/enums";

const router = express.Router();

router.get("/", controller.getAllMenuItems);
router.get("/:id", controller.getMenuItemById);
router.get(
    "/:id/cost",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    controller.getMenuItemCost,
);

router.post(
    "/create",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    controller.createMenuItem,
);

router.post(
    "/:id/bom",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    bomController.defineBillOfMaterials,
);

router.patch(
    "/:id",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN, UserRoleEnum.USER]),
    controller.updateMenuItem,
);
router.delete(
    "/:id",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    controller.deleteMenuItem,
);

export = router;
