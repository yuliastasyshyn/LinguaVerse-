import express from "express";
import {
  getWritingPrompts,
  checkWriting,
  evaluateWritingPrompt,
} from "../controllers/writingController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.get("/prompts", auth, getWritingPrompts);
router.post("/check", auth, checkWriting);
router.post("/evaluate", auth, evaluateWritingPrompt);

export default router;