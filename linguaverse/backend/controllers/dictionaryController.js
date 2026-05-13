import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const lessonsFilePath = path.join(__dirname, "../lessons.json");
const dictionaryFilePath = path.join(__dirname, "../dictionary.json");

const loadLessons = async () => {
  try {
    const data = await fs.readFile(lessonsFilePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading lessons file:", error);
    return [];
  }
};

const loadDictionary = async () => {
  try {
    const data = await fs.readFile(dictionaryFilePath, "utf-8");
    const parsed = JSON.parse(data);

    return {
      customWords: Array.isArray(parsed.customWords) ? parsed.customWords : [],
      collections: Array.isArray(parsed.collections) ? parsed.collections : [],
    };
  } catch (error) {
    console.error("Error reading dictionary file:", error);
    return { customWords: [], collections: [] };
  }
};

const saveDictionary = async (dictionary) => {
  try {
    await fs.writeFile(dictionaryFilePath, JSON.stringify(dictionary, null, 2));
  } catch (error) {
    console.error("Error saving dictionary file:", error);
  }
};

export const getDictionaryWords = async (req, res) => {
  try {
    const lessons = await loadLessons();
    const dictionary = await loadDictionary();

    const lessonWords = Array.from(
      new Set(lessons.flatMap((lesson) => lesson.vocabularyTips || []))
    );

    res.status(200).json({
      lessonWords,
      customWords: dictionary.customWords,
      collections: dictionary.collections,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load dictionary" });
  }
};

export const addDictionaryWord = async (req, res) => {
  try {
    const { word, translation, collectionId } = req.body;

    if (!word || !translation) {
      return res.status(400).json({ error: "Word and translation are required" });
    }

    const dictionary = await loadDictionary();
    const normalizedWord = word.trim();
    const normalizedTranslation = translation.trim();
    const normalizedCollectionId = collectionId ? Number(collectionId) : null;

    if (!normalizedWord || !normalizedTranslation) {
      return res.status(400).json({ error: "Word and translation cannot be empty" });
    }

    if (
      normalizedCollectionId &&
      !dictionary.collections.some((collection) => Number(collection.id) === normalizedCollectionId)
    ) {
      return res.status(404).json({ error: "Collection not found" });
    }

    const newWord = {
      id: Date.now(),
      word: normalizedWord,
      translation: normalizedTranslation,
      collectionId: normalizedCollectionId,
      addedAt: new Date().toISOString(),
    };

    dictionary.customWords = [...dictionary.customWords, newWord];
    await saveDictionary(dictionary);

    res.status(201).json({ word: newWord, customWords: dictionary.customWords });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add custom word" });
  }
};

export const deleteDictionaryWord = async (req, res) => {
  try {
    const { id } = req.params;
    const dictionary = await loadDictionary();

    dictionary.customWords = dictionary.customWords.filter(
      (word) => String(word.id) !== String(id)
    );

    await saveDictionary(dictionary);

    res.status(200).json({ customWords: dictionary.customWords });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete custom word" });
  }
};

export const createDictionaryCollection = async (req, res) => {
  try {
    const { name } = req.body;
    const normalizedName = name?.trim();

    if (!normalizedName) {
      return res.status(400).json({ error: "Collection name is required" });
    }

    const dictionary = await loadDictionary();
    const alreadyExists = dictionary.collections.some(
      (collection) => collection.name.toLowerCase() === normalizedName.toLowerCase()
    );

    if (alreadyExists) {
      return res.status(409).json({ error: "Collection already exists" });
    }

    const newCollection = {
      id: Date.now(),
      name: normalizedName,
      createdAt: new Date().toISOString(),
    };

    dictionary.collections = [...dictionary.collections, newCollection];
    await saveDictionary(dictionary);

    res.status(201).json({ collection: newCollection, collections: dictionary.collections });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create collection" });
  }
};

export const deleteDictionaryCollection = async (req, res) => {
  try {
    const { id } = req.params;
    const dictionary = await loadDictionary();

    dictionary.collections = dictionary.collections.filter(
      (collection) => String(collection.id) !== String(id)
    );

    dictionary.customWords = dictionary.customWords.map((word) =>
      String(word.collectionId) === String(id) ? { ...word, collectionId: null } : word
    );

    await saveDictionary(dictionary);

    res.status(200).json({
      collections: dictionary.collections,
      customWords: dictionary.customWords,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete collection" });
  }
};
