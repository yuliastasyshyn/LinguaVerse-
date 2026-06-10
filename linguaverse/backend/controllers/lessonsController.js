import { pool } from "../db/index.js";
import { ensureProgressTables } from "./progress.js";

function normalizeVocabulary(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeQuiz(value) {
  if (!value) return null;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!parsed || !parsed.question || !Array.isArray(parsed.options)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function normalizeLesson(row) {
  const vocabularyTips = normalizeVocabulary(row.vocabulary);

  return {
    id: row.id,
    title: row.title,
    level: row.level || "A1",
    duration: `${Number(row.duration) || 10} хв`,
    durationMinutes: Number(row.duration) || 10,
    description: row.description || "",
    status: row.status || "not_started",
    progress: Number(row.progress) || 0,
    xp: Number(row.xp) || 0,
    category: row.category || "General",
    content: row.content || "",
    vocabularyTips,
    quiz: normalizeQuiz(row.quiz),
    notes: row.notes || "",
  };
}

async function getLessonsFromDb() {
  const result = await pool.query(`
    SELECT
      id,
      title,
      description,
      language,
      level,
      duration,
      category,
      status,
      progress,
      xp,
      content,
      vocabulary,
      quiz,
      notes,
      created_at
    FROM lessons
    ORDER BY id ASC
  `);

  return result.rows.map(normalizeLesson);
}

async function getLessonFromDb(id) {
  const result = await pool.query(
    `
    SELECT
      id,
      title,
      description,
      language,
      level,
      duration,
      category,
      status,
      progress,
      xp,
      content,
      vocabulary,
      quiz,
      notes,
      created_at
    FROM lessons
    WHERE id = $1
    `,
    [id]
  );

  return result.rows[0] ? normalizeLesson(result.rows[0]) : null;
}

const getUserLessonProgress = async (userId) => {
  try {
    await ensureProgressTables();

    const result = await pool.query(
      `
      SELECT lesson_id, status, progress, checked_items, flashcards_seen, quiz_result, notes
      FROM user_lesson_progress
      WHERE user_id = $1
      `,
      [userId]
    );

    return result.rows.reduce((acc, row) => {
      acc[row.lesson_id] = {
        status: row.status,
        progress: Number(row.progress) || 0,
        checkedItems: row.checked_items || [],
        flashcardsSeen: row.flashcards_seen || [],
        quizResult: row.quiz_result || null,
        notes: row.notes || "",
      };
      return acc;
    }, {});
  } catch (error) {
    console.error("Error getting user lesson progress:", error);
    return {};
  }
};

const saveUserLessonProgress = async (userId, lessonId, progressData) => {
  try {
    await ensureProgressTables();

    const { status, progress, checkedItems, flashcardsSeen, quizResult, notes } = progressData;

    await pool.query(
      `
      INSERT INTO user_lesson_progress
        (user_id, lesson_id, status, progress, checked_items, flashcards_seen, quiz_result, notes, updated_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, NOW())
      ON CONFLICT (user_id, lesson_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        progress = EXCLUDED.progress,
        checked_items = EXCLUDED.checked_items,
        flashcards_seen = EXCLUDED.flashcards_seen,
        quiz_result = EXCLUDED.quiz_result,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      `,
      [
        userId,
        lessonId,
        status || "not_started",
        Number(progress) || 0,
        JSON.stringify(checkedItems || []),
        JSON.stringify(flashcardsSeen || []),
        quizResult ? JSON.stringify(quizResult) : null,
        notes || "",
      ]
    );
  } catch (error) {
    console.error("Error saving user lesson progress:", error);
  }
};

const countTruthy = (array) => (Array.isArray(array) ? array.filter(Boolean).length : 0);
const uniqueCount = (array) => (Array.isArray(array) ? [...new Set(array)].length : 0);

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

function mergeLessonWithProgress(lesson, progress = {}) {
  return {
    ...lesson,
    status: progress.status || lesson.status || "not_started",
    progress: progress.progress ?? lesson.progress ?? 0,
    checkedItems:
      progress.checkedItems || new Array(lesson.vocabularyTips?.length || 0).fill(false),
    flashcardsSeen: progress.flashcardsSeen || [],
    quizResult: progress.quizResult || null,
    notes: progress.notes || lesson.notes || "",
  };
}

export const getAllLessons = async (req, res) => {
  try {
    const userId = req.user.id;
    const baseLessons = await getLessonsFromDb();
    const userProgress = await getUserLessonProgress(userId);

    const lessons = baseLessons.map((lesson) =>
      mergeLessonWithProgress(lesson, userProgress[lesson.id])
    );

    res.status(200).json(lessons);
  } catch (error) {
    console.error("getAllLessons error:", error);
    res.status(500).json({ error: "Failed to fetch lessons", details: error.message });
  }
};

export const getLessonById = async (req, res) => {
  try {
    const lessonId = Number(req.params.id);
    const userId = req.user.id;
    const lesson = await getLessonFromDb(lessonId);

    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    const userProgress = await getUserLessonProgress(userId);
    const lessonWithProgress = mergeLessonWithProgress(lesson, userProgress[lesson.id]);

    res.status(200).json(lessonWithProgress);
  } catch (error) {
    console.error("getLessonById error:", error);
    res.status(500).json({ error: "Failed to fetch lesson", details: error.message });
  }
};

export const updateLessonProgress = async (req, res) => {
  try {
    const lessonId = Number(req.params.id);
    const userId = req.user.id;
    const { progress, status, checkedItems, flashcardsSeen, quizResult } = req.body;

    const lesson = await getLessonFromDb(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    const userProgress = await getUserLessonProgress(userId);
    const currentProgress = userProgress[lesson.id] || {};

    const updatedProgress = {
      status: status || currentProgress.status || "not_started",
      progress: progress !== undefined ? Number(progress) : currentProgress.progress || 0,
      checkedItems:
        checkedItems !== undefined
          ? checkedItems
          : currentProgress.checkedItems || new Array(lesson.vocabularyTips?.length || 0).fill(false),
      flashcardsSeen:
        flashcardsSeen !== undefined ? flashcardsSeen : currentProgress.flashcardsSeen || [],
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

    if (updatedProgress.progress === 100) {
      updatedProgress.status = "completed";
    } else if (updatedProgress.progress > 0 && updatedProgress.status === "not_started") {
      updatedProgress.status = "in_progress";
    }

    await saveUserLessonProgress(userId, lessonId, updatedProgress);

    res.status(200).json({ ...lesson, ...updatedProgress });
  } catch (error) {
    console.error("updateLessonProgress error:", error);
    res.status(500).json({ error: "Failed to update lesson progress", details: error.message });
  }
};

export const getLessonsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const userId = req.user.id;
    const baseLessons = await getLessonsFromDb();
    const userProgress = await getUserLessonProgress(userId);

    const lessons = baseLessons.map((lesson) =>
      mergeLessonWithProgress(lesson, userProgress[lesson.id])
    );

    if (status === "all") return res.status(200).json(lessons);

    res.status(200).json(lessons.filter((lesson) => lesson.status === status));
  } catch (error) {
    console.error("getLessonsByStatus error:", error);
    res.status(500).json({ error: "Failed to fetch lessons by status", details: error.message });
  }
};

export const getLessonsStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    const baseLessons = await getLessonsFromDb();
    const userProgress = await getUserLessonProgress(userId);

    const totalLessons = baseLessons.length;
    const lessonsWithProgress = baseLessons.map((lesson) =>
      mergeLessonWithProgress(lesson, userProgress[lesson.id])
    );

    const completedLessons = lessonsWithProgress.filter((lesson) => lesson.status === "completed").length;
    const inProgressLessons = lessonsWithProgress.filter((lesson) => lesson.status === "in_progress").length;

    const totalProgress = totalLessons
      ? Math.round(
          lessonsWithProgress.reduce((sum, lesson) => sum + (Number(lesson.progress) || 0), 0) /
            totalLessons
        )
      : 0;

    const totalXP = lessonsWithProgress.reduce((sum, lesson) => {
      return lesson.status === "completed" ? sum + (Number(lesson.xp) || 0) : sum;
    }, 0);

    res.status(200).json({
      totalLessons,
      completedLessons,
      inProgressLessons,
      totalProgress,
      totalXP,
    });
  } catch (error) {
    console.error("getLessonsStatistics error:", error);
    res.status(500).json({ error: "Failed to fetch statistics", details: error.message });
  }
};

export const startLesson = async (req, res) => {
  try {
    const lessonId = Number(req.params.id);
    const userId = req.user.id;
    const lesson = await getLessonFromDb(lessonId);

    if (!lesson) return res.status(404).json({ error: "Lesson not found" });

    const userProgress = await getUserLessonProgress(userId);
    const currentProgress = userProgress[lesson.id] || {};

    const updatedProgress = {
      status: currentProgress.status && currentProgress.status !== "not_started" ? currentProgress.status : "in_progress",
      progress: currentProgress.progress && currentProgress.progress > 0 ? currentProgress.progress : 1,
      checkedItems: currentProgress.checkedItems || new Array(lesson.vocabularyTips?.length || 0).fill(false),
      flashcardsSeen: currentProgress.flashcardsSeen || [],
      quizResult: currentProgress.quizResult || null,
      notes: currentProgress.notes || "",
    };

    await saveUserLessonProgress(userId, lessonId, updatedProgress);

    res.status(200).json({ ...lesson, ...updatedProgress });
  } catch (error) {
    console.error("startLesson error:", error);
    res.status(500).json({ error: "Failed to start lesson", details: error.message });
  }
};

export const completeLesson = async (req, res) => {
  try {
    const lessonId = Number(req.params.id);
    const userId = req.user.id;
    const lesson = await getLessonFromDb(lessonId);

    if (!lesson) return res.status(404).json({ error: "Lesson not found" });

    const userProgress = await getUserLessonProgress(userId);
    const currentProgress = userProgress[lesson.id] || {};

    const updatedProgress = {
      status: "completed",
      progress: 100,
      checkedItems: currentProgress.checkedItems || new Array(lesson.vocabularyTips?.length || 0).fill(false),
      flashcardsSeen: currentProgress.flashcardsSeen || [],
      quizResult: currentProgress.quizResult || null,
      notes: currentProgress.notes || "",
    };

    await saveUserLessonProgress(userId, lessonId, updatedProgress);

    res.status(200).json({ ...lesson, ...updatedProgress });
  } catch (error) {
    console.error("completeLesson error:", error);
    res.status(500).json({ error: "Failed to complete lesson", details: error.message });
  }
};

export const updateLessonNotes = async (req, res) => {
  try {
    const lessonId = Number(req.params.id);
    const userId = req.user.id;
    const { notes } = req.body;
    const lesson = await getLessonFromDb(lessonId);

    if (!lesson) return res.status(404).json({ error: "Lesson not found" });

    const userProgress = await getUserLessonProgress(userId);
    const currentProgress = userProgress[lesson.id] || {};

    const updatedProgress = {
      status: currentProgress.status || "not_started",
      progress: currentProgress.progress || 0,
      checkedItems: currentProgress.checkedItems || new Array(lesson.vocabularyTips?.length || 0).fill(false),
      flashcardsSeen: currentProgress.flashcardsSeen || [],
      quizResult: currentProgress.quizResult || null,
      notes: notes || "",
    };

    await saveUserLessonProgress(userId, lessonId, updatedProgress);

    res.status(200).json({ ...lesson, ...updatedProgress });
  } catch (error) {
    console.error("updateLessonNotes error:", error);
    res.status(500).json({ error: "Failed to save notes", details: error.message });
  }
};

export const saveQuizResult = async (req, res) => {
  try {
    const lessonId = Number(req.params.id);
    const userId = req.user.id;
    const { selectedIndex } = req.body;
    const lesson = await getLessonFromDb(lessonId);

    if (!lesson) return res.status(404).json({ error: "Lesson not found" });

    if (!lesson.quiz || typeof lesson.quiz.correctIndex !== "number") {
      return res.status(400).json({ error: "Quiz data not configured for this lesson" });
    }

    const correct = Number(selectedIndex) === Number(lesson.quiz.correctIndex);
    const userProgress = await getUserLessonProgress(userId);
    const currentProgress = userProgress[lesson.id] || {};

    const quizResult = {
      selectedIndex: Number(selectedIndex),
      correct,
      updatedAt: new Date().toISOString(),
    };

    const updatedProgress = {
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

    await saveUserLessonProgress(userId, lessonId, updatedProgress);

    res.status(200).json({ ...lesson, ...updatedProgress });
  } catch (error) {
    console.error("saveQuizResult error:", error);
    res.status(500).json({ error: "Failed to save quiz result", details: error.message });
  }
};
