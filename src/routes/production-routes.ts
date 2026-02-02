import Express from "express";
import * as controller from "../controllers/production-controller";
import { isAuthorized } from "../middlewares/is-authorised-middleware";
import { UserRoleEnum } from "../types/enums";

const router = Express.Router();

router.get(
    "/logs",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    controller.getProductionLogs,
);
router.get(
    "/wastage/summary",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    controller.getWastageSummary,
);
router.get(
    "/summary",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    controller.getProductionSummary,
);

router.post(
    "/",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    controller.runProduction,
);
router.post(
    "/wastage",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    controller.recordWastage,
);

export default router;
