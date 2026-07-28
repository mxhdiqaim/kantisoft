import express from "express";
import { UserRoleEnum } from "../types/enums";
import {
    createStoreManager,
    getAllStoresForSuperAdmin,
    onboardNewStore,
    storeSetupPayment,
} from "../controllers/super-admin-controller";
import { restrictTo } from "../shared/middlewares/restricted-to";

const router = express.Router();

router.use(restrictTo(UserRoleEnum.SUPER_ADMIN));

// Get all stores (for Super Admin)
router.get("/stores", getAllStoresForSuperAdmin);
router.post("/stores/onboard", onboardNewStore);

// User Management (Specific to Super Admin)
router.post("/managers/create", createStoreManager);

// Billing Management
router.post("/billing/store-setup-payment", storeSetupPayment);
// router.get("/billing/pending-invoices", getPendingInvoices);

export default router;
