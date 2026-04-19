/**
 * Auth Routes
 */

import express, { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import asyncHandler from "../utils/asyncHandler.js";

const router: Router = express.Router();

router.post("/signup", asyncHandler(authController.signup));
router.post("/login", asyncHandler(authController.login));
router.post("/check-user", asyncHandler(authController.checkUser));
router.post("/send-login-otp", asyncHandler(authController.sendLoginOTP));
router.post("/verify-login-otp", asyncHandler(authController.verifyLoginOTP));
router.get("/bootstrap", protect, asyncHandler(authController.getBootstrap));
router.get("/me", protect, asyncHandler(authController.getMe));
router.post("/logout", protect, asyncHandler(authController.logout));
router.post("/verify-account", protect, asyncHandler(authController.verifyAccount));
router.post("/resend-otp", protect, asyncHandler(authController.resendOTP));


export default router;

