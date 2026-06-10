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
    const { translatedPhrase, phrase, language } = req.body;

    const contextPhrase = String(translatedPhrase || phrase || "").trim();

    if (!contextPhrase) {
      return res.status(400).json({
        error: "Phrase is required",
      });
    }

    const ai = getGenAI();

    if (!ai) {
      return res.status(500).json({
        error: "Gemini API key is missing. Check GEMINI_API_KEY in backend .env",
      });
    }

    const model = ai.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const langLabel =
      {
        uk: "Ukrainian",
        en: "English",
        de: "German",
        fr: "French",
        es: "Spanish",
        it: "Italian",
        pl: "Polish",
      }[language] || "English";

    const prompt = `
You are a language learning assistant.

The user translated a word or phrase.
Now create learning context for the translated word or phrase.

Translated word or phrase: "${contextPhrase}"
Language: ${langLabel}

Return ONLY valid JSON. Do not use markdown. Do not use code blocks.

JSON format:
{
  "examples": [
    "sentence 1",
    "sentence 2",
    "sentence 3",
    "sentence 4"
  ],
  "synonyms": [
    "synonym 1",
    "synonym 2",
    "synonym 3",
    "synonym 4"
  ]
}

Rules:
- All examples must be in ${langLabel}.
- Every example must naturally include the exact word or phrase "${contextPhrase}".
- Examples must be useful for a language learner.
- Synonyms must be real synonyms or close alternatives in ${langLabel}.
- Do not write explanations.
- Do not translate the examples.
`;

    const result = await model.generateContent(prompt);
    const aiText = result.response.text();

    let cleaned = String(aiText || "")
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }

    let parsed;

    try {
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("Gemini JSON parse error:", parseError);
      console.log("Gemini raw response:", aiText);

      return res.status(500).json({
        error: "Gemini returned invalid JSON",
        raw: aiText,
      });
    }

    return res.json({
      phrase: contextPhrase,
      language,
      examples: Array.isArray(parsed.examples) ? parsed.examples : [],
      synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms : [],
    });
  } catch (error) {
    console.error("Context error:", error);

    return res.status(500).json({
      error: error.message || "Failed to get context examples",
    });
  }
});

export default router;