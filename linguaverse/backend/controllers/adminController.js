import { pool } from "../db/index.js";
import bcrypt from "bcryptjs";

async function tableExists(tableName) {
  const result = await pool.query(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS exists`,
    [tableName]
  );
  return Boolean(result.rows[0]?.exists);
}

async function columnExists(tableName, columnName) {
  const result = await pool.query(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
    ) AS exists`,
    [tableName, columnName]
  );
  return Boolean(result.rows[0]?.exists);
}

async function safeCount(tableName) {
  try {
    if (!(await tableExists(tableName))) return 0;
    const result = await pool.query(`SELECT COUNT(*)::int AS total FROM ${tableName}`);
    return result.rows[0]?.total || 0;
  } catch (error) {
    console.warn(`safeCount ${tableName}:`, error.message);
    return 0;
  }
}

async function safeQuery(query, params = [], fallback = []) {
  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.warn("safeQuery failed:", error.message);
    return fallback;
  }
}

function toInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function getAdminDashboard(req, res) {
  try {
    const [users, lessons, rooms, challenges, reviews, reports, aiChats] = await Promise.all([
      safeCount("users"),
      safeCount("lessons"),
      safeCount("rooms"),
      safeCount("challenges"),
      safeCount("reviews"),
      safeCount("reports"),
      safeCount("ai_logs"),
    ]);

    let activeToday = 0;
    if ((await tableExists("user_progress")) && (await columnExists("user_progress", "updated_at"))) {
      const rows = await safeQuery(`
        SELECT COUNT(DISTINCT user_id)::int AS total
        FROM user_progress
        WHERE updated_at::date = CURRENT_DATE
      `);
      activeToday = rows[0]?.total || 0;
    }

    const hasUsersCreatedAt = await columnExists("users", "created_at");

    const newUsersByDay = hasUsersCreatedAt
      ? await safeQuery(`
          SELECT TO_CHAR(created_at::date, 'DD.MM') AS label, COUNT(*)::int AS total
          FROM users
          WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
          GROUP BY created_at::date
          ORDER BY created_at::date
        `)
      : [];

    const activityByDay = (await tableExists("user_progress")) && (await columnExists("user_progress", "updated_at"))
      ? await safeQuery(`
          SELECT TO_CHAR(updated_at::date, 'DD.MM') AS label, COUNT(DISTINCT user_id)::int AS total
          FROM user_progress
          WHERE updated_at >= CURRENT_DATE - INTERVAL '6 days'
          GROUP BY updated_at::date
          ORDER BY updated_at::date
        `)
      : [];

    const aiUsageByDay = (await tableExists("ai_logs"))
      ? await safeQuery(`
          SELECT TO_CHAR(created_at::date, 'DD.MM') AS label, COUNT(*)::int AS total
          FROM ai_logs
          WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
          GROUP BY created_at::date
          ORDER BY created_at::date
        `)
      : [];

    const popularLessons = (await tableExists("lessons"))
      ? await safeQuery(`
          SELECT id, COALESCE(title, 'Lesson #' || id) AS title, COALESCE(views, 0)::int AS total
          FROM lessons
          ORDER BY COALESCE(views, 0) DESC, id DESC
          LIMIT 5
        `)
      : [];

    const popularWords = (await tableExists("dictionary"))
      ? await safeQuery(`
          SELECT COALESCE(word, title, text, 'word') AS word, COUNT(*)::int AS total
          FROM dictionary
          GROUP BY COALESCE(word, title, text, 'word')
          ORDER BY total DESC
          LIMIT 5
        `)
      : [];

    const recentUsers = await safeQuery(`
      SELECT
        id,
        name,
        email,
        COALESCE(role, 'user') AS role,
        COALESCE(status, 'active') AS status,
        ${hasUsersCreatedAt ? "created_at" : "NOW() AS created_at"}
      FROM users
      ORDER BY id DESC
      LIMIT 6
    `);

    res.json({
      stats: { users, activeToday, lessons, aiChats, challenges, rooms, reviews, reports },
      charts: { newUsersByDay, activityByDay, popularLessons, popularWords, aiUsageByDay },
      recentUsers,
    });
  } catch (error) {
    console.error("getAdminDashboard error:", error);
    res.status(500).json({ message: "Failed to load admin dashboard" });
  }
}

export async function getAdminUsers(req, res) {
  try {
    const search = String(req.query.search || "").trim();

    const result = await pool.query(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        COALESCE(u.role, 'user') AS role,
        COALESCE(u.status, 'active') AS status,
        COALESCE(u.daily_goal, 15) AS daily_goal,
        0 AS progress,
        NULL AS created_at
      FROM users u
      WHERE ($1 = '' OR LOWER(u.name) LIKE LOWER($2) OR LOWER(u.email) LIKE LOWER($2))
      ORDER BY u.id DESC
      LIMIT 100
      `,
      [search, `%${search}%`]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("getAdminUsers error:", error);
    res.status(500).json({
      message: "Failed to load users",
      error: error.message,
    });
  }
}

export async function getAdminUserById(req, res) {
  try {
    const { id } = req.params;
    const rows = await safeQuery(
      `
      SELECT
        u.id, u.name, u.email,
        COALESCE(u.role, 'user') AS role,
        COALESCE(u.status, 'active') AS status,
        COALESCE(u.daily_goal, 30)::int AS daily_goal,
        u.created_at,
        COALESCE(p.xp, 0)::int AS xp,
        COALESCE(p.words, 0)::int AS words,
        COALESCE(p.daily_minutes, 0)::int AS daily_minutes,
        COALESCE(p.active_days, 0)::int AS active_days
      FROM users u
      LEFT JOIN user_progress p ON p.user_id = u.id
      WHERE u.id = $1
      `,
      [id]
    );

    if (!rows[0]) return res.status(404).json({ message: "User not found" });
    res.json(rows[0]);
  } catch (error) {
    console.error("getAdminUserById error:", error);
    res.status(500).json({ message: "Failed to load user" });
  }
}

export async function updateAdminUser(req, res) {
  try {
    const { id } = req.params;
    const { name, email, role, status, daily_goal } = req.body;

    if (role && !["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Role must be user or admin" });
    }

    if (status && !["active", "blocked"].includes(status)) {
      return res.status(400).json({ message: "Status must be active or blocked" });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        role = COALESCE($3, role),
        status = COALESCE($4, status),
        daily_goal = COALESCE($5, daily_goal)
      WHERE id = $6
      RETURNING id, name, email, role, status, daily_goal, created_at
      `,
      [name || null, email || null, role || null, status || null, daily_goal ? toInt(daily_goal) : null, id]
    );

    if (!result.rows[0]) return res.status(404).json({ message: "User not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("updateAdminUser error:", error);
    res.status(500).json({ message: "Failed to update user" });
  }
}

export async function updateUserRole(req, res) {
  req.body = { role: req.body.role };
  return updateAdminUser(req, res);
}

export async function blockAdminUser(req, res) {
  req.body = { status: "blocked" };
  return updateAdminUser(req, res);
}

export async function unblockAdminUser(req, res) {
  req.body = { status: "active" };
  return updateAdminUser(req, res);
}

export async function resetAdminUserPassword(req, res) {
  try {
    const { id } = req.params;
    const temporaryPassword = `Lingua${Math.floor(1000 + Math.random() * 9000)}!`;
    const hashed = bcrypt.hashSync(temporaryPassword, 10);

    const result = await pool.query(
      `UPDATE users SET password = $1 WHERE id = $2 RETURNING id, email`,
      [hashed, id]
    );

    if (!result.rows[0]) return res.status(404).json({ message: "User not found" });

    res.json({
      message: "Password reset successfully",
      temporaryPassword,
    });
  } catch (error) {
    console.error("resetAdminUserPassword error:", error);
    res.status(500).json({ message: "Failed to reset password" });
  }
}

export async function deleteAdminUser(req, res) {
  try {
    const { id } = req.params;
    if (Number(id) === Number(req.user?.id)) {
      return res.status(400).json({ message: "You cannot delete yourself" });
    }

    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);
    if (!result.rows[0]) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  } catch (error) {
    console.error("deleteAdminUser error:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
}

function normalizeLessonArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeLessonQuiz(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  return {};
}

export async function getAdminLessons(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        title,
        description,
        language,
        level,
        duration,
        category,
        tags,
        status,
        progress,
        xp,
        content,
        vocabulary,
        quiz,
        notes,
        created_at
      FROM lessons
      ORDER BY id DESC
      LIMIT 150
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("getAdminLessons error:", error);
    res.status(500).json({
      message: "Failed to load lessons",
      error: error.message,
    });
  }
}

export async function createAdminLesson(req, res) {
  try {
    const {
      title,
      description,
      language,
      level,
      duration,
      category,
      tags,
      content,
      status,
      xp,
      vocabulary,
      quiz,
      notes,
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: "Lesson title is required" });
    }

    const lessonVocabulary = normalizeLessonArray(vocabulary);
    const lessonQuiz = normalizeLessonQuiz(quiz);

    const result = await pool.query(
      `
      INSERT INTO lessons
      (
        title,
        description,
        language,
        level,
        duration,
        category,
        tags,
        content,
        status,
        progress,
        xp,
        vocabulary,
        quiz,
        notes,
        exercises
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,$10,$11::jsonb,$12::jsonb,$13,'[]'::jsonb)
      RETURNING *
      `,
      [
        String(title).trim(),
        description || "",
        language || "English",
        level || "A1",
        toInt(duration) || 10,
        category || "General",
        tags || "",
        content || "",
        status || "published",
        toInt(xp) || 20,
        JSON.stringify(lessonVocabulary),
        JSON.stringify(lessonQuiz),
        notes || "",
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("createAdminLesson error:", error);
    res.status(500).json({
      message: "Failed to create lesson",
      error: error.message,
    });
  }
}

export async function updateAdminLesson(req, res) {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      language,
      level,
      duration,
      category,
      tags,
      content,
      status,
      xp,
      vocabulary,
      quiz,
      notes,
    } = req.body;

    const lessonVocabulary =
      vocabulary !== undefined ? JSON.stringify(normalizeLessonArray(vocabulary)) : null;
    const lessonQuiz = quiz !== undefined ? JSON.stringify(normalizeLessonQuiz(quiz)) : null;

    const result = await pool.query(
      `
      UPDATE lessons SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        language = COALESCE($3, language),
        level = COALESCE($4, level),
        duration = COALESCE($5, duration),
        category = COALESCE($6, category),
        tags = COALESCE($7, tags),
        content = COALESCE($8, content),
        status = COALESCE($9, status),
        xp = COALESCE($10, xp),
        vocabulary = COALESCE($11::jsonb, vocabulary),
        quiz = COALESCE($12::jsonb, quiz),
        notes = COALESCE($13, notes)
      WHERE id = $14
      RETURNING *
      `,
      [
        title || null,
        description || null,
        language || null,
        level || null,
        duration ? toInt(duration) : null,
        category || null,
        tags || null,
        content || null,
        status || null,
        xp ? toInt(xp) : null,
        lessonVocabulary,
        lessonQuiz,
        notes || null,
        id,
      ]
    );

    if (!result.rows[0]) return res.status(404).json({ message: "Lesson not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("updateAdminLesson error:", error);
    res.status(500).json({
      message: "Failed to update lesson",
      error: error.message,
    });
  }
}

export async function deleteAdminLesson(req, res) {
  try {
    const result = await pool.query("DELETE FROM lessons WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: "Lesson not found" });
    res.json({ message: "Lesson deleted" });
  } catch (error) {
    console.error("deleteAdminLesson error:", error);
    res.status(500).json({ message: "Failed to delete lesson" });
  }
}


export async function getAdminChallenges(req, res) {
  const rows = await safeQuery(`
    SELECT id, title, description, xp_reward, deadline, difficulty, badge, status, created_at
    FROM challenges
    ORDER BY id DESC
    LIMIT 150
  `);
  res.json(rows);
}

export async function createAdminChallenge(req, res) {
  try {
    const { title, description, xp_reward, deadline, difficulty, badge, status } = req.body;
    const result = await pool.query(
      `
      INSERT INTO challenges (title, description, xp_reward, deadline, difficulty, badge, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
      `,
      [title, description || "", toInt(xp_reward) || 50, deadline || null, difficulty || "medium", badge || "🏆", status || "active"]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("createAdminChallenge error:", error);
    res.status(500).json({ message: "Failed to create challenge" });
  }
}

export async function updateAdminChallenge(req, res) {
  try {
    const { id } = req.params;
    const { title, description, xp_reward, deadline, difficulty, badge, status } = req.body;
    const result = await pool.query(
      `
      UPDATE challenges SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        xp_reward = COALESCE($3, xp_reward),
        deadline = COALESCE($4, deadline),
        difficulty = COALESCE($5, difficulty),
        badge = COALESCE($6, badge),
        status = COALESCE($7, status)
      WHERE id = $8
      RETURNING *
      `,
      [title || null, description || null, xp_reward ? toInt(xp_reward) : null, deadline || null, difficulty || null, badge || null, status || null, id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Challenge not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("updateAdminChallenge error:", error);
    res.status(500).json({ message: "Failed to update challenge" });
  }
}

export async function deleteAdminChallenge(req, res) {
  try {
    const result = await pool.query("DELETE FROM challenges WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: "Challenge not found" });
    res.json({ message: "Challenge deleted" });
  } catch (error) {
    console.error("deleteAdminChallenge error:", error);
    res.status(500).json({ message: "Failed to delete challenge" });
  }
}

export async function getAdminRooms(req, res) {
  try {
    const rows = await pool.query(`
      SELECT
        r.id,
        COALESCE(r.name, 'Room #' || r.id) AS name,
        COALESCE(r.description, '') AS topic,
        'active' AS status,
        'Unknown' AS creator_name,
        0 AS messages_count,
        NOW() AS created_at
      FROM rooms r
      ORDER BY r.id DESC
      LIMIT 150
    `);

    res.json(rows.rows);
  } catch (error) {
    console.error("getAdminRooms error:", error);
    res.status(500).json({
      message: "Failed to load rooms",
      error: error.message,
    });
  }
}

export async function updateAdminRoomStatus(req, res) {
  try {
    const { status } = req.body;
    if (!["active", "closed"].includes(status)) {
      return res.status(400).json({ message: "Status must be active or closed" });
    }
    const result = await pool.query(
      `UPDATE rooms SET status = $1 WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Room not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("updateAdminRoomStatus error:", error);
    res.status(500).json({ message: "Failed to update room" });
  }
}

export async function deleteAdminRoom(req, res) {
  try {
    const result = await pool.query("DELETE FROM rooms WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: "Room not found" });
    res.json({ message: "Room deleted" });
  } catch (error) {
    console.error("deleteAdminRoom error:", error);
    res.status(500).json({ message: "Failed to delete room" });
  }
}
export async function getAdminReviews(req, res) {
  try {
    const rows = await pool.query(`
      SELECT
        r.id,
        COALESCE(r.name, 'User') AS name,
        '' AS email,
        COALESCE(r.rating, 5)::int AS rating,
        COALESCE(r.text, '') AS text,
        COALESCE(r.status, 'pending') AS status,
        COALESCE(r.featured, false) AS featured,
        COALESCE(r.created_at, NOW()) AS created_at
      FROM reviews r
      ORDER BY r.id DESC
      LIMIT 150
    `);

    res.json(rows.rows);
  } catch (error) {
    console.error("getAdminReviews error:", error);
    res.status(500).json({
      message: "Failed to load reviews",
      error: error.message,
    });
  }
}
export async function updateAdminReview(req, res) {
  try {
    const { status, featured } = req.body;
    const result = await pool.query(
      `UPDATE reviews SET status = COALESCE($1, status), featured = COALESCE($2, featured) WHERE id = $3 RETURNING *`,
      [status || null, typeof featured === "boolean" ? featured : null, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Review not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("updateAdminReview error:", error);
    res.status(500).json({ message: "Failed to update review" });
  }
}

export async function deleteAdminReview(req, res) {
  try {
    const result = await pool.query("DELETE FROM reviews WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: "Review not found" });
    res.json({ message: "Review deleted" });
  } catch (error) {
    console.error("deleteAdminReview error:", error);
    res.status(500).json({ message: "Failed to delete review" });
  }
}

export async function getAdminReports(req, res) {
  const rows = await safeQuery(`
    SELECT
      rep.id,
      rep.reason,
      rep.content,
      rep.status,
      rep.target_type,
      rep.target_id,
      rep.created_at,
      COALESCE(u.name, 'Unknown') AS reporter_name,
      COALESCE(u.email, '') AS reporter_email
    FROM reports rep
    LEFT JOIN users u ON u.id = rep.reporter_id
    ORDER BY rep.id DESC
    LIMIT 150
  `);
  res.json(rows);
}

export async function createAdminReport(req, res) {
  try {
    const { reason, content, target_type, target_id } = req.body;
    const result = await pool.query(
      `INSERT INTO reports (reporter_id, reason, content, target_type, target_id, status)
       VALUES ($1,$2,$3,$4,$5,'open') RETURNING *`,
      [req.user.id, reason, content || "", target_type || "general", target_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("createAdminReport error:", error);
    res.status(500).json({ message: "Failed to create report" });
  }
}

export async function updateAdminReport(req, res) {
  try {
    const { status } = req.body;
    const result = await pool.query(
      `UPDATE reports SET status = $1 WHERE id = $2 RETURNING *`,
      [status || "reviewed", req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Report not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("updateAdminReport error:", error);
    res.status(500).json({ message: "Failed to update report" });
  }
}

export async function getAdminSettings(req, res) {
  const rows = await safeQuery(`SELECT key, value FROM system_settings ORDER BY key ASC`);
  const settings = {};
  rows.forEach((row) => {
    settings[row.key] = row.value;
  });
  res.json(settings);
}

export async function updateAdminSettings(req, res) {
  try {
    const entries = Object.entries(req.body || {});
    for (const [key, value] of entries) {
      await pool.query(
        `INSERT INTO system_settings (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, String(value)]
      );
    }
    return getAdminSettings(req, res);
  } catch (error) {
    console.error("updateAdminSettings error:", error);
    res.status(500).json({ message: "Failed to update settings" });
  }
}

export async function getAdminAiLogs(req, res) {
  const rows = await safeQuery(`
    SELECT
      l.id,
      l.user_id,
      COALESCE(u.name, 'Unknown') AS user_name,
      l.mode,
      l.status,
      l.response_time_ms,
      l.error_message,
      l.created_at
    FROM ai_logs l
    LEFT JOIN users u ON u.id = l.user_id
    ORDER BY l.id DESC
    LIMIT 150
  `);
  res.json(rows);
}
