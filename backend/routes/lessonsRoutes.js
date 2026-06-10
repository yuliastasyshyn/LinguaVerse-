import express from "express";
import {
  getAllLessons,
  getLessonById,
  updateLessonProgress,
  getLessonsByStatus,
  getLessonsStatistics,
  startLesson,
  completeLesson,
  updateLessonNotes,
  saveQuizResult,
} from "../controllers/lessonsController.js";

const router = express.Router();


router.get("/", getAllLessons);


router.get("/statistics", getLessonsStatistics);


router.get("/status/:status", getLessonsByStatus);


router.get("/:id", getLessonById);


router.post("/:id/start", startLesson);


router.post("/:id/complete", completeLesson);


router.put("/:id/progress", updateLessonProgress);


router.put("/:id/notes", updateLessonNotes);


router.post("/:id/quiz", saveQuizResult);

export default router;
