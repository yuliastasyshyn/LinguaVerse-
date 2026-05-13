import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../db/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const lessonsFilePath = path.join(__dirname, "../lessons.json");

const toSafeInt = (value, fallback = 0) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.round(num));
};

const normalizeDateOnly = (input) => {
  const date = new Date(input);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const calculateStreaks = (historyRows = []) => {
  if (!historyRows.length) {
    return {
      current: 0,
      longest: 0,
      totalActiveDays: 0,
    };
  }

  const uniqueSorted = [...new Set(historyRows.map((row) => normalizeDateOnly(row.date).getTime()))]
    .sort((a, b) => b - a)
    .map((ms) => new Date(ms));

  const totalActiveDays = uniqueSorted.length;

  let longest = 1;
  let running = 1;
  for (let i = 1; i < uniqueSorted.length; i += 1) {
    const diffDays = Math.round((uniqueSorted[i - 1] - uniqueSorted[i]) / 86400000);
    if (diffDays === 1) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 1;
    }
  }

  const today = normalizeDateOnly(new Date());
  const latest = uniqueSorted[0];
  const latestDiff = Math.round((today - latest) / 86400000);

  let current = 0;
  if (latestDiff <= 1) {
    current = 1;
    for (let i = 1; i < uniqueSorted.length; i += 1) {
      const diffDays = Math.round((uniqueSorted[i - 1] - uniqueSorted[i]) / 86400000);
      if (diffDays === 1) {
        current += 1;
      } else {
        break;
      }
    }
  }

  return {
    current,
    longest,
    totalActiveDays,
  };
};

export const ensureProgressTables = async () => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS user_progress (
      user_id INTEGER PRIMARY KEY,
      xp INTEGER DEFAULT 0,
      words INTEGER DEFAULT 0,
      daily_minutes INTEGER DEFAULT 0,
      active_days INTEGER DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS user_daily_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      date DATE NOT NULL,
      xp INTEGER DEFAULT 0,
      words INTEGER DEFAULT 0,
      minutes INTEGER DEFAULT 0,
      lessons_completed INTEGER DEFAULT 0,
      quizzes_completed INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, date)
    )`
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS user_lesson_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      lesson_id INTEGER NOT NULL,
      status VARCHAR(20) DEFAULT 'not_started',
      progress INTEGER DEFAULT 0,
      checked_items JSONB DEFAULT '[]',
      flashcards_seen JSONB DEFAULT '[]',
      quiz_result JSONB,
      notes TEXT DEFAULT '',
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, lesson_id)
    )`
  );
};

const readLessons = async () => {
  try {
    const file = await fs.readFile(lessonsFilePath, "utf-8");
    return JSON.parse(file);
  } catch (err) {
    console.error("Failed to read lessons file:", err);
    return [];
  }
};

const makeLessonSummary = (baseLessons, userProgress) => {
  const totalLessons = baseLessons.length;
  const completedLessons = Object.values(userProgress).filter((p) => p.status === "completed").length;
  const inProgressLessons = Object.values(userProgress).filter((p) => p.status === "in_progress").length;
  const averageProgress = totalLessons
    ? Math.round(Object.values(userProgress).reduce((sum, p) => sum + (p.progress || 0), 0) / totalLessons)
    : 0;

  return { totalLessons, completedLessons, inProgressLessons, averageProgress };
};

const calculateDailyScore = ({ xp, words, minutes, lessonsCompleted, quizzesCompleted }) => {
  const xpScore = Math.min(xp / 20, 1) * 15;
  const timeScore = Math.min(minutes / 30, 1) * 35;
  const lessonScore = Math.min(lessonsCompleted, 2) * 20;
  const wordScore = Math.min(words / 10, 1) * 10;
  const quizScore = Math.min(quizzesCompleted, 1) * 10;

  return Math.round(Math.min(xpScore + timeScore + lessonScore + wordScore + quizScore, 100));
};

const getOrCreateUserProgress = async (user_id) => {
  const result = await pool.query(
    "SELECT xp, words, daily_minutes, active_days, updated_at FROM user_progress WHERE user_id = $1",
    [user_id]
  );

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  const insert = await pool.query(
    `INSERT INTO user_progress (user_id, xp, words, daily_minutes, active_days)
     VALUES ($1, 0, 0, 0, 0)
     RETURNING xp, words, daily_minutes, active_days, updated_at`,
    [user_id]
  );

  return insert.rows[0];
};

const getDailyHistory = async (user_id, limit = 30) => {
  const result = await pool.query(
    `SELECT
      date,
      xp,
      words,
      minutes,
      lessons_completed AS "lessonsCompleted",
      quizzes_completed AS "quizzesCompleted"
     FROM user_daily_progress
     WHERE user_id = $1
     ORDER BY date DESC
     LIMIT $2`,
    [user_id, limit]
  );
  return result.rows;
};

const getUserLessonProgress = async (userId) => {
  try {
    await ensureProgressTables();
    const result = await pool.query(
      "SELECT lesson_id, status, progress FROM user_lesson_progress WHERE user_id = $1",
      [userId]
    );
    return result.rows.reduce((acc, row) => {
      acc[row.lesson_id] = {
        status: row.status,
        progress: row.progress,
      };
      return acc;
    }, {});
  } catch (error) {
    console.error("Error getting user lesson progress:", error);
    return {};
  }
};

const getTodayProgressRow = async (user_id) => {
  const result = await pool.query(
    `SELECT
      id,
      xp,
      words,
      minutes,
      lessons_completed AS "lessonsCompleted",
      quizzes_completed AS "quizzesCompleted"
     FROM user_daily_progress
     WHERE user_id = $1 AND date = CURRENT_DATE`,
    [user_id]
  );
  return result.rows[0] || null;
};

const createTodayProgressRow = async (user_id, xp = 0, words = 0, minutes = 0, lessonsCompleted = 0, quizzesCompleted = 0) => {
  const result = await pool.query(
    `INSERT INTO user_daily_progress (user_id, date, xp, words, minutes, lessons_completed, quizzes_completed)
     VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6)
     RETURNING id, xp, words, minutes, lessons_completed AS "lessonsCompleted", quizzes_completed AS "quizzesCompleted"`,
    [user_id, xp, words, minutes, lessonsCompleted, quizzesCompleted]
  );
  return result.rows[0];
};

const updateTodayProgressRow = async (user_id, xp = 0, words = 0, minutes = 0, lessonsCompleted = 0, quizzesCompleted = 0) => {
  const result = await pool.query(
    `UPDATE user_daily_progress
     SET xp = xp + $1,
         words = words + $2,
         minutes = minutes + $3,
         lessons_completed = lessons_completed + $4,
         quizzes_completed = quizzes_completed + $5
     WHERE user_id = $6 AND date = CURRENT_DATE
     RETURNING id, xp, words, minutes, lessons_completed AS "lessonsCompleted", quizzes_completed AS "quizzesCompleted"`,
    [xp, words, minutes, lessonsCompleted, quizzesCompleted, user_id]
  );
  return result.rows[0];
};

const buildProgressPayload = async (userId) => {
  const progress = await getOrCreateUserProgress(userId);
  const todayRow =
    (await getTodayProgressRow(userId)) || {
      xp: 0,
      words: 0,
      minutes: 0,
      lessonsCompleted: 0,
      quizzesCompleted: 0,
    };
  const history = await getDailyHistory(userId, 30);
  const lessons = await readLessons();
  const userProgress = await getUserLessonProgress(userId);
  const lessonSummary = makeLessonSummary(lessons, userProgress);
  const streak = calculateStreaks(history);

  const dailyScore = calculateDailyScore({
    xp: todayRow.xp,
    words: todayRow.words,
    minutes: todayRow.minutes,
    lessonsCompleted: todayRow.lessonsCompleted,
    quizzesCompleted: todayRow.quizzesCompleted,
  });

  return {
    ...progress,
    active_days: streak.totalActiveDays,
    current_streak: streak.current,
    longest_streak: streak.longest,
    today: {
      ...todayRow,
      score: dailyScore,
    },
    history,
    streak,
    lessonSummary,
  };
};

export const getProgress = async (req, res) => {
  const id = req.user.id;

  try {
    await ensureProgressTables();
    const payload = await buildProgressPayload(id);

    await pool.query(
      `UPDATE user_progress
       SET active_days = $1, updated_at = NOW()
       WHERE user_id = $2`,
      [payload.streak.totalActiveDays, id]
    );
    

    res.json(payload);
  } catch (err) {
    console.error("getProgress error:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const updateProgress = async (req, res) => {
  const id = req.user.id;
  const xp = toSafeInt(req.body?.xp, 0);
  const words = toSafeInt(req.body?.words, 0);
  const minutes = toSafeInt(req.body?.minutes, 0);
  const lessonsCompleted = toSafeInt(req.body?.lessonsCompleted, 0);
  const quizzesCompleted = toSafeInt(req.body?.quizzesCompleted, 0);

  try {
    await ensureProgressTables();
    await getOrCreateUserProgress(id);

    const todayRow = await getTodayProgressRow(id);
    const isFirstUpdateToday = !todayRow;

    if (isFirstUpdateToday) {
      await pool.query(
        `UPDATE user_progress
         SET xp = xp + $1,
             words = words + $2,
             daily_minutes = daily_minutes + $3,
             active_days = active_days + 1,
             updated_at = NOW()
         WHERE user_id = $4`,
        [xp, words, minutes, id]
      );
      await createTodayProgressRow(id, xp, words, minutes, lessonsCompleted, quizzesCompleted);
    } else {
      await pool.query(
        `UPDATE user_progress
         SET xp = xp + $1,
             words = words + $2,
             daily_minutes = daily_minutes + $3,
             updated_at = NOW()
         WHERE user_id = $4`,
        [xp, words, minutes, id]
      );
      await updateTodayProgressRow(id, xp, words, minutes, lessonsCompleted, quizzesCompleted);
    }

    const payload = await buildProgressPayload(id);

    await pool.query(
      `UPDATE user_progress
       SET active_days = $1, updated_at = NOW()
       WHERE user_id = $2`,
      [payload.streak.totalActiveDays, id]
    );

    res.json(payload);
  } catch (err) {
    console.error("updateProgress error:", err);
    res.status(500).json({ message: "Failed to update progress", error: err });
  }
};
