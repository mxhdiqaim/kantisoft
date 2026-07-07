import express from "express";
import {
    signout,
    resendVerification,
    signup,
    forgotPassword,
    auth,
} from "../controllers/auth.controller";
import { authenticateToken } from "../shared/middlewares/auth.middleware";

const router = express.Router();

router.post("/", auth);

router.post("/signup", signup);

router.post("/resend-verification", resendVerification);

router.post("/forgot-password", forgotPassword);

router.post("/signout", authenticateToken, signout);

export default router;
