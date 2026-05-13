import { pool } from "../db/index.js";

const normalizeRoomId = (id) => Number(id);

export const ensureRoomsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255),
      title VARCHAR(255),
      level VARCHAR(50) NOT NULL DEFAULT 'A1',
      topic VARCHAR(255) NOT NULL DEFAULT 'General',
      language VARCHAR(50) NOT NULL DEFAULT 'English',
      max_participants INTEGER NOT NULL DEFAULT 10,
      participants INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS name VARCHAR(255)`);
  await pool.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS title VARCHAR(255)`);
  await pool.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS level VARCHAR(50) NOT NULL DEFAULT 'A1'`);
  await pool.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS topic VARCHAR(255) NOT NULL DEFAULT 'General'`);
  await pool.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS language VARCHAR(50) NOT NULL DEFAULT 'English'`);
  await pool.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS max_participants INTEGER NOT NULL DEFAULT 10`);
  await pool.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS participants INTEGER NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS description TEXT`);
  await pool.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL`);
  await pool.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`);

  await pool.query(`UPDATE rooms SET title = name WHERE title IS NULL AND name IS NOT NULL`);
  await pool.query(`UPDATE rooms SET name = title WHERE name IS NULL AND title IS NOT NULL`);
  await pool.query(`UPDATE rooms SET title = 'Conversation Room ' || id WHERE title IS NULL`);
  await pool.query(`UPDATE rooms SET name = title WHERE name IS NULL`);
};

export const ensureMessagesTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      user_name VARCHAR(255) NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_room_id_created_at ON messages(room_id, created_at)`);
};

const roomSelectSql = `
  SELECT
    id,
    COALESCE(name, title, 'Conversation Room ' || id) AS name,
    COALESCE(title, name, 'Conversation Room ' || id) AS title,
    level,
    topic,
    language,
    max_participants,
    participants,
    description,
    created_by,
    created_at
  FROM rooms
`;

export const getRooms = async (req, res) => {
  try {
    await ensureRoomsTable();

    const result = await pool.query(`${roomSelectSql} ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error("getRooms error:", err);
    res.status(500).json({ message: "Server error while loading rooms" });
  }
};

export const getRoomById = async (req, res) => {
  const roomId = normalizeRoomId(req.params.id);

  if (!Number.isInteger(roomId)) {
    return res.status(400).json({ message: "Invalid room id" });
  }

  try {
    await ensureRoomsTable();

    const result = await pool.query(`${roomSelectSql} WHERE id = $1`, [roomId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("getRoomById error:", err);
    res.status(500).json({ message: "Server error while loading room" });
  }
};

export const getRoomMessages = async (req, res) => {
  const roomId = normalizeRoomId(req.params.id);

  if (!Number.isInteger(roomId)) {
    return res.status(400).json({ message: "Invalid room id" });
  }

  try {
    await ensureMessagesTable();

    const result = await pool.query(
      `
      SELECT
        id,
        room_id,
        user_id,
        user_name,
        text,
        created_at
      FROM messages
      WHERE room_id = $1
      ORDER BY created_at ASC
      `,
      [roomId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("getRoomMessages error:", err);
    res.status(500).json({ message: "Server error while loading messages" });
  }
};

export const createRoom = async (req, res) => {
  const { name, title, level, topic, language, maxParticipants, max_participants, description } = req.body;
  const roomName = String(name || title || "").trim();
  const userId = req.user?.id;
  const maxParticipantsValue = Number(maxParticipants || max_participants || 10);

  if (!roomName || !level || !topic || !language) {
    return res.status(400).json({ message: "Please fill in room name, level, topic and language" });
  }

  if (!Number.isInteger(maxParticipantsValue) || maxParticipantsValue < 2 || maxParticipantsValue > 50) {
    return res.status(400).json({ message: "Max participants must be a number from 2 to 50" });
  }

  try {
    await ensureRoomsTable();

    const result = await pool.query(
      `
      INSERT INTO rooms (
        name,
        title,
        level,
        topic,
        language,
        max_participants,
        description,
        created_by,
        participants
      )
      VALUES ($1, $1, $2, $3, $4, $5, $6, $7, 0)
      RETURNING
        id,
        name,
        title,
        level,
        topic,
        language,
        max_participants,
        participants,
        description,
        created_by,
        created_at
      `,
      [
        roomName,
        String(level).trim(),
        String(topic).trim(),
        String(language).trim(),
        maxParticipantsValue,
        description ? String(description).trim() : null,
        userId || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("createRoom error:", err);
    res.status(500).json({ message: "Server error while creating room" });
  }
};

export async function createMessageRecord({ roomId, userId, userName, text }) {
  const normalizedRoomId = normalizeRoomId(roomId);
  const messageText = String(text || "").trim();

  if (!Number.isInteger(normalizedRoomId)) {
    throw new Error("Invalid room id");
  }

  if (!messageText) {
    throw new Error("Message text is required");
  }

  await ensureRoomsTable();
  await ensureMessagesTable();

  const roomExists = await pool.query(`SELECT id FROM rooms WHERE id = $1`, [normalizedRoomId]);
  if (roomExists.rows.length === 0) {
    throw new Error("Room not found");
  }

  const result = await pool.query(
    `
    INSERT INTO messages (room_id, user_id, user_name, text)
    VALUES ($1, $2, $3, $4)
    RETURNING id, room_id, user_id, user_name, text, created_at
    `,
    [normalizedRoomId, userId || null, userName || "User", messageText]
  );

  return result.rows[0];
}

export const createMessageHandler = async (req, res) => {
  try {
    const message = await createMessageRecord({
      roomId: req.params.id,
      userId: req.user?.id,
      userName: req.user?.name || req.user?.email || "User",
      text: req.body?.text,
    });

    res.status(201).json(message);
  } catch (err) {
    console.error("createMessageHandler error:", err);
    res.status(500).json({ message: err.message || "Server error while sending message" });
  }
};
