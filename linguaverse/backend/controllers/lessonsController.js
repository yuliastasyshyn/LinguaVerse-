import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../db/index.js";
import { ensureProgressTables } from "./progress.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const lessonsFilePath = path.join(__dirname, "../lessons.json");

// Завантажити уроки з файлу
const loadLessons = async () => {
  try {
    const data = await fs.readFile(lessonsFilePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading lessons file:", error);
    return [];
  }
};

// Зберегти уроки в файл
const saveLessons = async (lessons) => {
  try {
    await fs.writeFile(lessonsFilePath, JSON.stringify(lessons, null, 2));
  } catch (error) {
    console.error("Error saving lessons file:", error);
  }
};

// Отримати прогрес уроків користувача з БД
const getUserLessonProgress = async (userId) => {
  try {
    await ensureProgressTables();
    const result = await pool.query(
      "SELECT lesson_id, status, progress, checked_items, flashcards_seen, quiz_result, notes FROM user_lesson_progress WHERE user_id = $1",
      [userId]
    );
    return result.rows.reduce((acc, row) => {
      acc[row.lesson_id] = {
        status: row.status,
        progress: row.progress,
        checkedItems: row.checked_items || [],
        flashcardsSeen: row.flashcards_seen || [],
        quizResult: row.quiz_result,
        notes: row.notes || "",
      };
      return acc;
    }, {});
  } catch (error) {
    console.error("Error getting user lesson progress:", error);
    return {};
  }
};

// Зберегти прогрес уроку користувача в БД
const saveUserLessonProgress = async (userId, lessonId, progressData) => {
  try {
    await ensureProgressTables();
    const { status, progress, checkedItems, flashcardsSeen, quizResult, notes } = progressData;
    await pool.query(
      `INSERT INTO user_lesson_progress (user_id, lesson_id, status, progress, checked_items, flashcards_seen, quiz_result, notes, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (user_id, lesson_id)
       DO UPDATE SET
         status = EXCLUDED.status,
         progress = EXCLUDED.progress,
         checked_items = EXCLUDED.checked_items,
         flashcards_seen = EXCLUDED.flashcards_seen,
         quiz_result = EXCLUDED.quiz_result,
         notes = EXCLUDED.notes,
         updated_at = NOW()`,
      [userId, lessonId, status, progress, JSON.stringify(checkedItems), JSON.stringify(flashcardsSeen), quizResult ? JSON.stringify(quizResult) : null, notes]
    );
  } catch (error) {
    console.error("Error saving user lesson progress:", error);
  }
};

const countTruthy = (array) => Array.isArray(array) ? array.filter(Boolean).length : 0;
const uniqueCount = (array) => Array.isArray(array) ? [...new Set(array)].length : 0;

const calculateLessonProgress = (lesson) => {
  const vocabTotal = lesson.vocabularyTips?.length || 0;
  const vocabDone = countTruthy(lesson.checkedItems);
  const vocabScore = vocabTotal ? vocabDone / vocabTotal : 0;

  const flashTotal = lesson.vocabularyTips?.length || 0;
  const flashDone = uniqueCount(lesson.flashcardsSeen);
  const flashScore = flashTotal ? Math.min(flashDone, flashTotal) / flashTotal : 0;

  const quizScore = lesson.quizResult?.correct ? 1 : 0;
  const rawProgress = vocabScore * 0.4 + flashScore * 0.3 + quizScore * 0.3;

  return Math.round(Math.min(rawProgress, 1) * 100);
};

// Отримати всі уроки
export const getAllLessons = async (req, res) => {
  try {
    const userId = req.user.id;
    await ensureProgressTables(); // Переконатися, що таблиці існують
    const baseLessons = await loadLessons();
    const userProgress = await getUserLessonProgress(userId);

    const lessons = baseLessons.map(lesson => {
      const progress = userProgress[lesson.id] || {};
      return {
        ...lesson,
        status: progress.status || "not_started",
        progress: progress.progress || 0,
        checkedItems: progress.checkedItems || new Array(lesson.vocabularyTips?.length || 0).fill(false),
        flashcardsSeen: progress.flashcardsSeen || [],
        quizResult: progress.quizResult || null,
        notes: progress.notes || "",
      };
    });

    res.status(200).json(lessons);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch lessons" });
  }
};

// Отримати один урок за ID
export const getLessonById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const baseLessons = await loadLessons();
    const lesson = baseLessons.find((l) => l.id === parseInt(id));

    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    const userProgress = await getUserLessonProgress(userId);
    const progress = userProgress[lesson.id] || {};

    const lessonWithProgress = {
      ...lesson,
      status: progress.status || "not_started",
      progress: progress.progress || 0,
      checkedItems: progress.checkedItems || new Array(lesson.vocabularyTips?.length || 0).fill(false),
      flashcardsSeen: progress.flashcardsSeen || [],
      quizResult: progress.quizResult || null,
      notes: progress.notes || "",
    };

    res.status(200).json(lessonWithProgress);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch lesson" });
  }
};

// Оновити прогрес урока
export const updateLessonProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { progress, status, checkedItems, flashcardsSeen, quizResult } = req.body;

    const baseLessons = await loadLessons();
    const lessonIndex = baseLessons.findIndex((l) => l.id === parseInt(id));

    if (lessonIndex === -1) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    const lesson = baseLessons[lessonIndex];

    // Отримати поточний прогрес користувача
    const userProgress = await getUserLessonProgress(userId);
    const currentProgress = userProgress[lesson.id] || {};

    const updatedProgress = {
      status: status || currentProgress.status || "not_started",
      progress: progress !== undefined ? progress : currentProgress.progress || 0,
      checkedItems: checkedItems !== undefined ? checkedItems : currentProgress.checkedItems || new Array(lesson.vocabularyTips?.length || 0).fill(false),
      flashcardsSeen: flashcardsSeen !== undefined ? flashcardsSeen : currentProgress.flashcardsSeen || [],
      quizResult: quizResult !== undefined ? quizResult : currentProgress.quizResult,
      notes: currentProgress.notes || "",
    };

    if (typeof progress === "number") {
      updatedProgress.progress = Math.min(progress, 100);
    } else {
      updatedProgress.progress = calculateLessonProgress({
        ...lesson,
        checkedItems: updatedProgress.checkedItems,
        flashcardsSeen: updatedProgress.flashcardsSeen,
        quizResult: updatedProgress.quizResult,
      });
    }

    if (status) {
      updatedProgress.status = status;
    }

    if (updatedProgress.progress === 100) {
      updatedProgress.status = "completed";
    } else if (updatedProgress.progress > 0 && updatedProgress.status === "not_started") {
      updatedProgress.status = "in_progress";
    }

    // Зберегти в БД
    await saveUserLessonProgress(userId, parseInt(id), updatedProgress);

    const lessonWithProgress = {
      ...lesson,
      ...updatedProgress,
    };

    res.status(200).json(lessonWithProgress);
  } catch (error) {
    res.status(500).json({ error: "Failed to update lesson progress" });
  }
};

// Отримати прогрес за фільтром (completed, in_progress, not_started)
export const getLessonsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const userId = req.user.id;
    const baseLessons = await loadLessons();
    const userProgress = await getUserLessonProgress(userId);

    const lessons = baseLessons.map(lesson => {
      const progress = userProgress[lesson.id] || {};
      return {
        ...lesson,
        status: progress.status || "not_started",
        progress: progress.progress || 0,
        checkedItems: progress.checkedItems || new Array(lesson.vocabularyTips?.length || 0).fill(false),
        flashcardsSeen: progress.flashcardsSeen || [],
        quizResult: progress.quizResult || null,
        notes: progress.notes || "",
      };
    });

    if (status === "all") {
      return res.status(200).json(lessons);
    }

    const filtered = lessons.filter((l) => l.status === status);
    res.status(200).json(filtered);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch lessons by status" });
  }
};

// Отримати статистику про уроки
export const getLessonsStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    const baseLessons = await loadLessons();
    const userProgress = await getUserLessonProgress(userId);

    const totalLessons = baseLessons.length;
    const completedLessons = Object.values(userProgress).filter((p) => p.status === "completed").length;
    const inProgressLessons = Object.values(userProgress).filter((p) => p.status === "in_progress").length;
    const totalProgress = Math.round(
      baseLessons.reduce((sum, lesson) => {
        const progress = userProgress[lesson.id]?.progress || 0;
        return sum + progress;
      }, 0) / totalLessons
    );
    const totalXP = baseLessons.reduce((sum, lesson) => {
      const progress = userProgress[lesson.id];
      if (progress?.status === "completed") return sum + lesson.xp;
      return sum;
    }, 0);

    res.status(200).json({
      totalLessons,
      completedLessons,
      inProgressLessons,
      totalProgress,
      totalXP,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
};

// Почати урок (встановити статус in_progress)
export const startLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const baseLessons = await loadLessons();
    const lesson = baseLessons.find((l) => l.id === parseInt(id));

    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    const userProgress = await getUserLessonProgress(userId);
    const currentProgress = userProgress[lesson.id] || {};

    if (currentProgress.status === "not_started") {
      const updatedProgress = {
        ...currentProgress,
        status: "in_progress",
        progress: 1,
        checkedItems: currentProgress.checkedItems || new Array(lesson.vocabularyTips?.length || 0).fill(false),
        flashcardsSeen: currentProgress.flashcardsSeen || [],
        quizResult: currentProgress.quizResult,
        notes: currentProgress.notes || "",
      };
      await saveUserLessonProgress(userId, parseInt(id), updatedProgress);
    }

    const lessonWithProgress = {
      ...lesson,
      status: "in_progress",
      progress: 1,
      checkedItems: currentProgress.checkedItems || new Array(lesson.vocabularyTips?.length || 0).fill(false),
      flashcardsSeen: currentProgress.flashcardsSeen || [],
      quizResult: currentProgress.quizResult || null,
      notes: currentProgress.notes || "",
    };

    res.status(200).json(lessonWithProgress);
  } catch (error) {
    res.status(500).json({ error: "Failed to start lesson" });
  }
};

// Завершити урок
export const completeLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const baseLessons = await loadLessons();
    const lesson = baseLessons.find((l) => l.id === parseInt(id));

    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    const userProgress = await getUserLessonProgress(userId);
    const currentProgress = userProgress[lesson.id] || {};

    const updatedProgress = {
      ...currentProgress,
      status: "completed",
      progress: 100,
      checkedItems: currentProgress.checkedItems || new Array(lesson.vocabularyTips?.length || 0).fill(false),
      flashcardsSeen: currentProgress.flashcardsSeen || [],
      quizResult: currentProgress.quizResult,
      notes: currentProgress.notes || "",
    };

    await saveUserLessonProgress(userId, parseInt(id), updatedProgress);

    const lessonWithProgress = {
      ...lesson,
      ...updatedProgress,
    };

    res.status(200).json(lessonWithProgress);
  } catch (error) {
    res.status(500).json({ error: "Failed to complete lesson" });
  }
};

// Оновити нотатки до урока
export const updateLessonNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { notes } = req.body;

    const baseLessons = await loadLessons();
    const lesson = baseLessons.find((l) => l.id === parseInt(id));

    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    const userProgress = await getUserLessonProgress(userId);
    const currentProgress = userProgress[lesson.id] || {};

    const updatedProgress = {
      ...currentProgress,
      status: currentProgress.status || "not_started",
      progress: currentProgress.progress || 0,
      checkedItems: currentProgress.checkedItems || new Array(lesson.vocabularyTips?.length || 0).fill(false),
      flashcardsSeen: currentProgress.flashcardsSeen || [],
      quizResult: currentProgress.quizResult,
      notes: notes || "",
    };

    await saveUserLessonProgress(userId, parseInt(id), updatedProgress);

    const lessonWithProgress = {
      ...lesson,
      ...updatedProgress,
    };

    res.status(200).json(lessonWithProgress);
  } catch (error) {
    res.status(500).json({ error: "Failed to save notes" });
  }
};

// Зберегти результат тесту
export const saveQuizResult = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { selectedIndex } = req.body;

    const baseLessons = await loadLessons();
    const lesson = baseLessons.find((l) => l.id === parseInt(id));

    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    if (!lesson.quiz || typeof lesson.quiz.correctIndex !== "number") {
      return res.status(400).json({ error: "Quiz data not configured for this lesson" });
    }

    const correct = selectedIndex === lesson.quiz.correctIndex;

    const userProgress = await getUserLessonProgress(userId);
    const currentProgress = userProgress[lesson.id] || {};

    const quizResult = {
      selectedIndex,
      correct,
      updatedAt: new Date().toISOString(),
    };

    const updatedProgress = {
      ...currentProgress,
      status: currentProgress.status || "not_started",
      checkedItems: currentProgress.checkedItems || new Array(lesson.vocabularyTips?.length || 0).fill(false),
      flashcardsSeen: currentProgress.flashcardsSeen || [],
      quizResult,
      notes: currentProgress.notes || "",
      progress: calculateLessonProgress({
        ...lesson,
        checkedItems: currentProgress.checkedItems || new Array(lesson.vocabularyTips?.length || 0).fill(false),
        flashcardsSeen: currentProgress.flashcardsSeen || [],
        quizResult,
      }),
    };

    if (updatedProgress.progress === 100) {
      updatedProgress.status = "completed";
    } else if (updatedProgress.progress > 0 && updatedProgress.status === "not_started") {
      updatedProgress.status = "in_progress";
    }

    await saveUserLessonProgress(userId, parseInt(id), updatedProgress);

    const lessonWithProgress = {
      ...lesson,
      ...updatedProgress,
    };

    res.status(200).json(lessonWithProgress);
  } catch (error) {
    res.status(500).json({ error: "Failed to save quiz result" });
  }
};
