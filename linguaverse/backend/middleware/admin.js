import { pool } from "../db/index.js";

export default async function adminOnly(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = await pool.query(
      "SELECT id, role FROM users WHERE id = $1",
      [req.user.id]
    );

    const user = result.rows[0];

    if (!user || user.role !== "admin") {
      return res.status(403).json({
        message: "Access denied. Admin role required.",
      });
    }

    next();
  } catch (error) {
    console.error("adminOnly middleware error:", error);
    return res.status(500).json({ message: "Admin check failed" });
  }
}
