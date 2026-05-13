import { pool } from "../db/index.js";

// Допоміжна функція для визначення рівня по XP
function calculateLevel(xp) {
  if (xp >= 2000) return "B2";
  if (xp >= 1200) return "B1";
  if (xp >= 600) return "A2";
  return "A1";
}

// Створити таблиці налаштувань користувача якщо їхнього немає
const ensureUserSettingsTable = async () => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY,
      native_language VARCHAR(50) DEFAULT 'uk',
      learning_language VARCHAR(50) DEFAULT 'en',
      daily_goal_xp INTEGER DEFAULT 100,
      reminders_enabled BOOLEAN DEFAULT true,
      achievements_enabled BOOLEAN DEFAULT true,
      public_profile BOOLEAN DEFAULT false,
      show_stats BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`
  );
};

// ==============================
// GET PROFILE
// ==============================
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Переконатися, що таблиця существует
    await ensureUserSettingsTable();

    const userResult = await pool.query(
      `SELECT id, name, email, created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "Користувача не знайдено" });
    }

    // Crear la fila de configuración del usuario si no existe
    await pool.query(
      `INSERT INTO user_settings (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    const settingsResult = await pool.query(
      `SELECT native_language,
              learning_language,
              daily_goal_xp,
              reminders_enabled,
              achievements_enabled,
              public_profile,
              show_stats
       FROM user_settings
       WHERE user_id = $1`,
      [userId]
    );

    const progressResult = await pool.query(
      `SELECT xp, words, daily_minutes, active_days, updated_at
       FROM user_progress
       WHERE user_id = $1`,
      [userId]
    );

    const user = userResult.rows[0];
    const settings = settingsResult.rows[0] || {};
    const progress = progressResult.rows[0] || {
      xp: 0,
      words: 0,
      daily_minutes: 0,
      active_days: 0,
      updated_at: null,
    };

    const level = calculateLevel(progress.xp || 0);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
      },
      settings,
      progress: {
        xp: progress.xp || 0,
        words: progress.words || 0,
        daily_minutes: progress.daily_minutes || 0,
        active_days: progress.active_days || 0,
        updated_at: progress.updated_at || null,
      },
      derived: {
        level,
        badges: 0,
      },
    });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);
    res.status(500).json({ message: "Помилка сервера при отриманні профілю" });
  }
};

// ==============================
// UPDATE PROFILE
// ==============================
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Переконатися, що таблиця існує
    await ensureUserSettingsTable();

    const {
      name,
      native_language,
      learning_language,
      daily_goal_xp,
      reminders_enabled,
      achievements_enabled,
      public_profile,
      show_stats,
    } = req.body;

    if (typeof name === "string" && name.trim()) {
      await pool.query(
        `UPDATE users
         SET name = $1
         WHERE id = $2`,
        [name.trim(), userId]
      );
    }

    await pool.query(
      `INSERT INTO user_settings (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    await pool.query(
      `UPDATE user_settings
       SET native_language = COALESCE($1, native_language),
           learning_language = COALESCE($2, learning_language),
           daily_goal_xp = COALESCE($3, daily_goal_xp),
           reminders_enabled = COALESCE($4, reminders_enabled),
           achievements_enabled = COALESCE($5, achievements_enabled),
           public_profile = COALESCE($6, public_profile),
           show_stats = COALESCE($7, show_stats),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $8`,
      [
        native_language ?? null,
        learning_language ?? null,
        daily_goal_xp ?? null,
        reminders_enabled ?? null,
        achievements_enabled ?? null,
        public_profile ?? null,
        show_stats ?? null,
        userId,
      ]
    );

    return res.json({ message: "Профіль успішно оновлено" });
  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error);
    res.status(500).json({ message: "Помилка сервера при оновленні профілю" });
  }
};