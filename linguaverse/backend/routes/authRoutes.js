import express from "express";
import {
  register,
  login,
  sendVerificationCode,
  verifyRegistrationCode,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.post("/send-verification-code", sendVerificationCode);
router.post("/verify-registration-code", verifyRegistrationCode);

export default router;