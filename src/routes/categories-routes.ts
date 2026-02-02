import express from "express";
import * as controller from "../controllers/category-controller";
import { isAuthorized } from "../middlewares/is-authorised-middleware";
import { UserRoleEnum } from "../types/enums";

const router = express.Router();

router.get("/", controller.getAllCategories);

router.post(
    "/create",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    controller.createCategory,
);

router.patch(
    "/:id",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    controller.updateCategory,
);

router.delete(
    "/:id",
    isAuthorized([UserRoleEnum.MANAGER, UserRoleEnum.ADMIN]),
    controller.deleteCategory,
);

export = router;
