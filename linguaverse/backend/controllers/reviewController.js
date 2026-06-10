import { pool } from "../db/index.js";

async function ensureReviewsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      email TEXT,
      name TEXT NOT NULL,
      rating INTEGER NOT NULL DEFAULT 5,
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);
  await pool.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS email TEXT`);
  await pool.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS name TEXT`);
  await pool.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 5`);
  await pool.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS text TEXT`);
  await pool.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
}

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function normalizeRating(rating) {
  const value = Number(rating);
  if (!Number.isFinite(value)) return 5;
  return Math.min(5, Math.max(1, Math.round(value)));
}

export const getReviews = async (req, res) => {
  try {
    await ensureReviewsTable();

    const result = await pool.query(
      `SELECT
          r.id,
          COALESCE(NULLIF(TRIM(r.name), ''), u.name, r.email, 'Користувач') AS name,
          COALESCE(r.email, u.email) AS email,
          r.rating,
          r.text,
          r.created_at
       FROM reviews r
       LEFT JOIN users u ON u.id = r.user_id
       ORDER BY r.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Get reviews error:", error);
    res.status(500).json({ message: "Помилка отримання відгуків" });
  }
};

export const createReview = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const name = String(req.body.name || "").trim();
  const text = String(req.body.text || "").trim();
  const rating = normalizeRating(req.body.rating);

  if (!email || !text) {
    return res.status(400).json({
      message: "Введіть електронну адресу та текст відгуку.",
    });
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: "Введіть коректну електронну адресу." });
  }

  try {
    await ensureReviewsTable();

    const userResult = await pool.query(
      `SELECT id, name, email
       FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(403).json({
        message: "Відгук можуть залишати лише зареєстровані користувачі. Такої пошти в додатку немає.",
      });
    }

    const reviewerName = name || user.name || user.email;

    const result = await pool.query(
      `INSERT INTO reviews (user_id, email, name, rating, text)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, rating, text, created_at`,
      [user.id, user.email, reviewerName, rating, text]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Create review error:", error);
    res.status(500).json({ message: "Помилка створення відгуку" });
  }
};
