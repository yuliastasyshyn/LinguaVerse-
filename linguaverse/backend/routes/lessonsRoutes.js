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

// Отримати всі уроки
router.get("/", getAllLessons);

// Отримати статистику
router.get("/statistics", getLessonsStatistics);

// Отримати уроки за статусом (all, completed, in_progress, not_started)
router.get("/status/:status", getLessonsByStatus);

// Отримати один урок
router.get("/:id", getLessonById);

// Почати урок
router.post("/:id/start", startLesson);

// Завершити урок
router.post("/:id/complete", completeLesson);

// Оновити прогрес
router.put("/:id/progress", updateLessonProgress);

// Оновити нотатки
router.put("/:id/notes", updateLessonNotes);

// Зберегти результат тесту
router.post("/:id/quiz", saveQuizResult);

export default router;
