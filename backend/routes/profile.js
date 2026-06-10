import express from "express";
import { getProfile, updateProfile } from "../controllers/profileController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.get("/", auth, getProfile);
router.put("/", auth, updateProfile);

export default router;