import express from "express";
import { evaluatePronunciation } from "../controllers/pronunciationController.js";

const router = express.Router();

router.post("/evaluate", evaluatePronunciation);




export default router;