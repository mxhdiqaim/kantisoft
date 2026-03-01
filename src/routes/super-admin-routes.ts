import express from "express";
import { UserRoleEnum } from "../types/enums";
import {
    confirmStorePayment,
    createStoreManager,
    getAllStoresForSuperAdmin,
    onboardNewStore,
} from "../controllers/super-admin-controller";
import { restrictTo } from "../middlewares/restricted-to";

const router = express.Router();

router.use(restrictTo(UserRoleEnum.SUPER_ADMIN));

// Get all stores (for Super Admin)
router.get("/stores", getAllStoresForSuperAdmin);

// Store Management
// router.get("/stores/all", getAllStoresForSuperAdmin); // See all stores in the system
router.post("/stores/onboard", onboardNewStore);

// User Management (Specific to Super Admin)
router.post("/managers/create", createStoreManager);

// Billing Management
router.post("/billing/confirm-payment", confirmStorePayment);
// router.get("/billing/pending-invoices", getPendingInvoices);

export default router;
