import express from "express";

import auth from "./auth.routes";
import users from "./users-routes";
import menuItems from "./menu-items-routes";
import orders from "./order-routes";
import dashboard from "./dashboard-routes";
import stores from "./store-routes";
import activities from "./activity-routes";
import inventory from "./inventory-routes";
import unitOfMeasurement from "./unit-of-measurement-routes";
import rawMaterials from "./raw-material-routes";
import billOfMaterial from "./bill-of-material-routes";
import production from "./production-routes";
import categories from "./categories-routes";
import superAdminRoutes from "./super-admin-routes";
import { validateStoreAccess } from "../shared/middlewares/validate-store-access";
import { StatusCodes } from "http-status-codes";
import { handleTargetStore } from "../shared/middlewares/handle-target-store-middleware";
// import { authenticateToken } from "../shared/middlewares/auth.middleware";

const router = express.Router();

router.get("/health", (_req, res) => {
    res.status(StatusCodes.OK).json({
        status: "ok",
        message: "API is up and running",
        timestamp: new Date().toISOString(),
    });
});

router.use("/auth", auth);

// router.use(authenticateToken);

// Super Admin routes (not store-scoped)
router.use("/super-admin", superAdminRoutes);

// Global middleware to handle store targeting for Managers
router.use(handleTargetStore);

// These routes need to be protected and scoped to the user's store
router.use("/stores", validateStoreAccess, stores);
router.use("/users", validateStoreAccess, users);
router.use("/menu-items", validateStoreAccess, menuItems);
router.use("/orders", validateStoreAccess, orders);
router.use("/dashboard", validateStoreAccess, dashboard);
router.use("/unit-of-measurement", validateStoreAccess, unitOfMeasurement);
router.use("/activities", validateStoreAccess, activities);
router.use("/raw-materials", validateStoreAccess, rawMaterials);
router.use("/inventory", validateStoreAccess, inventory);
router.use("/production", validateStoreAccess, production);
router.use("/bill-of-materials", validateStoreAccess, billOfMaterial);
router.use("/categories", validateStoreAccess, categories);

export default router;
