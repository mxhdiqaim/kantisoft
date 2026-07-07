import express from "express";
import * as controller from "../controllers/activity-controller";
import { isAuthorized } from "../shared/middlewares/is-authorised-middleware";
import { UserRoleEnum } from "../types/enums";

const router = express.Router();

// This endpoint will fetch the activity log
router.get(
    "/",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    controller.getActivities,
);

export default router;
