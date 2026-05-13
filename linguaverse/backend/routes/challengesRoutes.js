import express from "express";
import { getChallenges } from "../controllers/challengesController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.get("/", auth, getChallenges);

export default router;