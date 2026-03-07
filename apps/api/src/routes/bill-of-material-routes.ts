import Express from "express";
import * as controller from "../controllers/bill-of-materials-controller";
import { isAuthorized } from "../middlewares/is-authorised-middleware";
import { UserRoleEnum } from "../types/enums";

const router = Express.Router();

router.get(
    "/:id/bom",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    controller.getBillOfMaterials,
);

export default router;
