import express from "express";
import { getProgress, updateProgress } from "../controllers/progress.js";
import auth from "../middleware/auth.js";

const router = express.Router();


router.get("/", auth, getProgress);


router.post("/update", auth, updateProgress);

export default router;
