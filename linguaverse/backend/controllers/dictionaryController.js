import { pool } from "../db/index.js";

const getUserId = (req) => {
  return req.user?.id || req.user?.userId || req.user?.user_id || null;
};

const parseVocabulary = (vocabulary) => {
  if (!vocabulary) return [];

  if (Array.isArray(vocabulary)) {
    return vocabulary
      .map((item) => {
        if (typeof item === "string") return item;

        if (item && typeof item === "object") {
          return item.word || item.text || item.value || "";
        }

        return "";
      })
      .filter(Boolean);
  }

  if (typeof vocabulary === "string") {
    try {
      const parsed = JSON.parse(vocabulary);

      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => {
            if (typeof item === "string") return item;

            if (item && typeof item === "object") {
              return item.word || item.text || item.value || "";
            }

            return "";
          })
          .filter(Boolean);
      }

      return [];
    } catch {
      return vocabulary
        .split(/[,;\n]/)
        .map((word) => word.trim())
        .filter(Boolean);
    }
  }

  return [];
};

export const getDictionaryWords = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const lessonsResult = await pool.query(`
      SELECT vocabulary
      FROM lessons
      WHERE vocabulary IS NOT NULL
    `);

    const lessonWords = Array.from(
      new Set(
        lessonsResult.rows.flatMap((lesson) =>
          parseVocabulary(lesson.vocabulary)
        )
      )
    );

    const dictionaryResult = await pool.query(
      `
      SELECT 
        id,
        user_id,
        word,
        translation,
        created_at AS "addedAt"
      FROM dictionary_words
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

    res.status(200).json({
      lessonWords,
      customWords: dictionaryResult.rows,
      collections: []
    });
  } catch (error) {
    console.error("Error loading dictionary:", error);
    res.status(500).json({ error: "Failed to load dictionary" });
  }
};

export const addDictionaryWord = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { word, translation } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!word || !translation) {
      return res.status(400).json({
        error: "Word and translation are required"
      });
    }

    const normalizedWord = word.trim();
    const normalizedTranslation = translation.trim();

    if (!normalizedWord || !normalizedTranslation) {
      return res.status(400).json({
        error: "Word and translation cannot be empty"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO dictionary_words (user_id, word, translation)
      VALUES ($1, $2, $3)
      RETURNING 
        id,
        user_id,
        word,
        translation,
        created_at AS "addedAt"
      `,
      [userId, normalizedWord, normalizedTranslation]
    );

    const dictionaryResult = await pool.query(
      `
      SELECT 
        id,
        user_id,
        word,
        translation,
        created_at AS "addedAt"
      FROM dictionary_words
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

    res.status(201).json({
      word: result.rows[0],
      customWords: dictionaryResult.rows
    });
  } catch (error) {
    console.error("Error adding dictionary word:", error);
    res.status(500).json({ error: "Failed to add custom word" });
  }
};

export const deleteDictionaryWord = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await pool.query(
      `
      DELETE FROM dictionary_words
      WHERE id = $1 AND user_id = $2
      `,
      [id, userId]
    );

    const dictionaryResult = await pool.query(
      `
      SELECT 
        id,
        user_id,
        word,
        translation,
        created_at AS "addedAt"
      FROM dictionary_words
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

    res.status(200).json({
      customWords: dictionaryResult.rows
    });
  } catch (error) {
    console.error("Error deleting dictionary word:", error);
    res.status(500).json({ error: "Failed to delete custom word" });
  }
};

export const createDictionaryCollection = async (req, res) => {
  res.status(501).json({
    error: "Collections are not implemented in database"
  });
};

export const deleteDictionaryCollection = async (req, res) => {
  res.status(501).json({
    error: "Collections are not implemented in database"
  });
};