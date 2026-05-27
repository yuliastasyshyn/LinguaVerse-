import express from "express";
import translate from "translate-google";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();

let genAI = null;

function getGenAI() {
  if (genAI) return genAI;
  if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY не знайдено");
    return null;
  }
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI;
}

router.post("/", async (req, res) => {
  try {
    const { text, fromLang, toLang } = req.body;

    if (!text) {
      return res.status(400).json({
        message: "Text is required",
      });
    }

    const translatedText = await translate(text, {
      from: fromLang,
      to: toLang,
    });

    res.json({
      translation: translatedText,
    });
  } catch (error) {
    console.error("Translation error:", error);

    res.status(500).json({
      message: "Translation failed",
    });
  }
});

router.post("/context", async (req, res) => {
  try {
    const { phrase, language } = req.body;

    if (!phrase) {
      return res.status(400).json({ error: "Phrase is required" });
    }

    const ai = getGenAI();
    if (!ai) {
      return res.status(500).json({ error: "AI service unavailable" });
    }

    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

    const langLabel = {
      uk: "Ukrainian",
      en: "English",
      de: "German",
      fr: "French",
      es: "Spanish",
      it: "Italian",
      pl: "Polish",
    }[language] || "the target language";

    const prompt = `Provide 4–5 natural example sentences that use the phrase "${phrase}" in ${langLabel}. Reply ONLY with the example sentences in ${langLabel} (no translations, no explanations). Each example should be a single sentence and include the exact phrase.`;

    const result = await model.generateContent(prompt);
    const examples = result.response.text();

    res.json({
      phrase,
      language,
      examples: examples,
    });
  } catch (error) {
    console.error("Context error:", error);
    res.status(500).json({ error: "Failed to get context examples" });
  }
});

export default router;