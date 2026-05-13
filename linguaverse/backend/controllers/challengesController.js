import { pool } from "../db/index.js";

const challengeDefinitions = [
  {
    key: "daily_focus",
    title: "Денний фокус",
    description: "Проведіть 30 хвилин у навчанні сьогодні.",
    type: "minutes_today",
    goal: 30,
    unit: "хв",
    rewardXp: 20,
    accent: "green",
  },
  {
    key: "xp_sprint",
    title: "XP-спринт",
    description: "Наберіть 20 XP за день.",
    type: "xp_today",
    goal: 20,
    unit: "XP",
    rewardXp: 15,
    accent: "blue",
  },
  {
    key: "word_hunter",
    title: "Мисливець за словами",
    description: "Вивчіть 10 нових слів за день.",
    type: "words_today",
    goal: 10,
    unit: "слів",
    rewardXp: 20,
    accent: "violet",
  },
  {
    key: "stability",
    title: "Стабільність",
    description: "Утримуйте серію навчання 7 днів поспіль.",
    type: "streak",
    goal: 7,
    unit: "днів",
    rewardXp: 35,
    accent: "orange",
  },
  {
    key: "lesson_master",
    title: "Підкорювач уроків",
    description: "Завершіть 3 уроки у своєму курсі.",
    type: "lessons_completed",
    goal: 3,
    unit: "уроків",
    rewardXp: 30,
    accent: "pink",
  },
];

const toInt = (value, fallback = 0) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.round(num));
};

const formatProgressLabel = (value, goal, unit) => `${value}/${goal} ${unit}`;

async function ensureChallengeTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_progress (
      user_id INTEGER PRIMARY KEY,
      xp INTEGER DEFAULT 0,
      words INTEGER DEFAULT 0,
      daily_minutes INTEGER DEFAULT 0,
      active_days INTEGER DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_daily_progress (
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
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_lesson_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      lesson_id INTEGER NOT NULL,
      status VARCHAR(20) DEFAULT 'not_started',
      progress INTEGER DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, lesson_id)
    )
  `);
}

async function getTodayStats(userId) {
  const result = await pool.query(
    `
      SELECT xp, words, minutes, lessons_completed
      FROM user_daily_progress
      WHERE user_id = $1 AND date = CURRENT_DATE
    `,
    [userId]
  );

  if (result.rows.length === 0) {
    return { xp: 0, words: 0, minutes: 0, lessons_completed: 0 };
  }

  return {
    xp: toInt(result.rows[0].xp),
    words: toInt(result.rows[0].words),
    minutes: toInt(result.rows[0].minutes),
    lessons_completed: toInt(result.rows[0].lessons_completed),
  };
}

async function getCompletedLessonsCount(userId) {
  const result = await pool.query(
    `
      SELECT COUNT(*)::int AS completed
      FROM user_lesson_progress
      WHERE user_id = $1 AND status = 'completed'
    `,
    [userId]
  );

  return toInt(result.rows[0]?.completed);
}

async function getCurrentStreak(userId) {
  const result = await pool.query(
    `
      SELECT date
      FROM user_daily_progress
      WHERE user_id = $1
        AND (xp > 0 OR words > 0 OR minutes > 0 OR lessons_completed > 0 OR quizzes_completed > 0)
      ORDER BY date DESC
    `,
    [userId]
  );

  if (result.rows.length === 0) return 0;

  const dates = result.rows.map((row) => {
    const d = new Date(row.date);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const first = dates[0].getTime();
  const validStart = first === today.getTime() || first === yesterday.getTime();
  if (!validStart) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i += 1) {
    const prev = dates[i - 1];
    const current = dates[i];
    const diffDays = Math.round((prev - current) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      streak += 1;
    } else if (diffDays === 0) {
      continue;
    } else {
      break;
    }
  }

  return streak;
}

function buildChallenges({ todayStats, currentStreak, completedLessons }) {
  return challengeDefinitions.map((challenge) => {
    let current = 0;

    switch (challenge.type) {
      case "minutes_today":
        current = todayStats.minutes;
        break;
      case "xp_today":
        current = todayStats.xp;
        break;
      case "words_today":
        current = todayStats.words;
        break;
      case "streak":
        current = currentStreak;
        break;
      case "lessons_completed":
        current = completedLessons;
        break;
      default:
        current = 0;
    }

    const progress = Math.min(100, Math.round((current / challenge.goal) * 100));
    const completed = current >= challenge.goal;

    return {
      ...challenge,
      current,
      progress,
      completed,
      progressLabel: formatProgressLabel(current, challenge.goal, challenge.unit),
    };
  });
}

export const getChallenges = async (req, res) => {
  try {
    const userId = req.user.id;

    await ensureChallengeTables();

    const [todayStats, currentStreak, completedLessons] = await Promise.all([
      getTodayStats(userId),
      getCurrentStreak(userId),
      getCompletedLessonsCount(userId),
    ]);

    const challenges = buildChallenges({ todayStats, currentStreak, completedLessons });
    const completedCount = challenges.filter((item) => item.completed).length;

    res.json({
      summary: {
        currentStreak,
        completedCount,
        totalCount: challenges.length,
        todayMinutes: todayStats.minutes,
        todayXp: todayStats.xp,
        todayWords: todayStats.words,
        completedLessons,
      },
      challenges,
    });
  } catch (error) {
    console.error("getChallenges error:", error);
    res.status(500).json({ message: "Не вдалося отримати челенджі" });
  }
};
