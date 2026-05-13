import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
  user: "postgres",      // ← твій логін PostgreSQL
  password: "090705",      // ← твій пароль PostgreSQL
  host: "localhost",
  port: 5432,
  database: "linguaverse" // ← НАЗВА твого database у pgAdmin
});
