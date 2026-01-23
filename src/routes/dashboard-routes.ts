import express from "express";
import * as controller from "../controllers/dashboard-controller";
import { isAuthorized } from "../middlewares/is-authorised-middleware";
import { UserRoleEnum } from "../types/enums";

const router = express.Router();

router.get(
    "/sales-summary",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    controller.getSalesSummary,
);
router.get(
    "/top-sells",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    controller.getTopSells,
);

router.get(
    "/sales-trend",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    controller.getSalesTrend,
);
router.get(
    "/inventory-health-valuation",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    controller.getInventoryValuationAndHealth,
);

router.get(
    "/menu-profit-margins",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    controller.getMenuProfitMargins,
);

export = router;
