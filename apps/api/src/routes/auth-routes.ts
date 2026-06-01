import express from "express";
import * as controller from "../controllers/user-controller";
import {
    loginUser,
    signUp,
} from "../controllers/user-controller";
import {authenticateToken} from "../middlewares/auth.middleware";

const router = express.Router();

// Public route for new manager/store registration
router.post("/signup", signUp);

// Public route for logging in
router.post("/login", loginUser);

// Protected route for logging out
router.post("/logout", authenticateToken, controller.logoutUser);

export default router;
