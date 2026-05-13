import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI = null;

function getModel() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing in backend .env");
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });
}

function safeJsonParse(text) {
  try {
    let cleaned = String(text || "")
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }

    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function clampScore(value, fallback = 7) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(1, Math.min(10, Math.round(num)));
}

function normalizeCheckResponse(data, originalText) {
  return {
    originalText: data?.originalText || originalText,
    correctedText: data?.correctedText || originalText,
    improvedText: data?.improvedText || data?.correctedText || originalText,
    score: {
      grammar: clampScore(data?.score?.grammar, 7),
      vocabulary: clampScore(data?.score?.vocabulary, 7),
      clarity: clampScore(data?.score?.clarity, 7),
      overall: clampScore(data?.score?.overall, 7),
    },
    mistakes: Array.isArray(data?.mistakes)
      ? data.mistakes
          .filter((item) => item && (item.original || item.correct || item.explanation))
          .slice(0, 8)
          .map((item) => ({
            original: item.original || "",
            correct: item.correct || "",
            explanation: item.explanation || "No explanation provided.",
          }))
      : [],
    summary: data?.summary || "Analysis completed.",
  };
}

function normalizeEvaluationResponse(data, prompt, text) {
  return {
    prompt: data?.prompt || prompt,
    userText: data?.userText || text,
    feedback: {
      grammar: data?.feedback?.grammar || "No grammar feedback.",
      vocabulary: data?.feedback?.vocabulary || "No vocabulary feedback.",
      style: data?.feedback?.style || "No style feedback.",
      overallComment: data?.feedback?.overallComment || "No overall comment.",
    },
    score: {
      grammar: clampScore(data?.score?.grammar, 7),
      vocabulary: clampScore(data?.score?.vocabulary, 7),
      style: clampScore(data?.score?.style, 7),
      overall: clampScore(data?.score?.overall, 7),
    },
    suggestions: Array.isArray(data?.suggestions)
      ? data.suggestions.slice(0, 3)
      : [
          "Add more detail.",
          "Check grammar carefully.",
          "Make your writing more natural.",
        ],
    improvedVersion: data?.improvedVersion || text,
  };
}

const PROMPTS = [
  { id: 1, level: "A1-A2", type: "Description", text: "Describe your last vacation." },
  { id: 2, level: "A2-B1", type: "Email", text: "Write an email to your teacher and explain why you missed class." },
  { id: 3, level: "A2-B1", type: "Routine", text: "Describe your daily routine and mention what you like most about your day." },
  { id: 4, level: "B1", type: "Opinion", text: "Write about why learning English is important for your future." },
  { id: 5, level: "B1-B2", type: "Story", text: "Tell a short story about a difficult day that ended well." },
  { id: 6, level: "B1-B2", type: "Formal writing", text: "Write a short message to invite a friend to a study session." },
];

async function generateStructuredJson(prompt) {
  const model = getModel();

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = safeJsonParse(text);

  if (!parsed) {
    throw new Error("Gemini returned invalid JSON");
  }

  return parsed;
}

export async function getWritingPrompts(req, res) {
  res.json({ prompts: PROMPTS });
}

export async function checkWriting(req, res) {
  try {
    const { text = "" } = req.body;

    if (!text.trim()) {
      return res.status(400).json({ message: "Text is required" });
    }

    const aiPrompt = `
You are an English writing assistant for learners.
Analyze the student's text and return ONLY valid JSON.

Required JSON shape:
{
  "originalText": "string",
  "correctedText": "string",
  "improvedText": "string",
  "score": {
    "grammar": 1,
    "vocabulary": 1,
    "clarity": 1,
    "overall": 1
  },
  "mistakes": [
    {
      "original": "string",
      "correct": "string",
      "explanation": "string"
    }
  ],
  "summary": "string"
}

Rules:
- Scores must be integers from 1 to 10.
- Return at most 8 mistakes.
- Keep explanations very simple for learners.
- correctedText should preserve meaning and fix grammar/spelling.
- improvedText should sound natural and polished.
- Do not wrap JSON in markdown.
- Focus only on English writing quality.
- Do not invent mistakes if the text is already acceptable.

Student text:
${text}
    `.trim();

    const raw = await generateStructuredJson(aiPrompt);
    const response = normalizeCheckResponse(raw, text);

    if (!response.mistakes.length) {
      response.mistakes = [
        {
          original: "—",
          correct: "—",
          explanation: "Явних помилок не знайдено.",
        },
      ];
    }

    res.json(response);
  } catch (error) {
    console.error("checkWriting error:", error.message);
    res.status(500).json({
      message: "Real AI analysis failed",
      error: error.message,
    });
  }
}

export async function evaluateWritingPrompt(req, res) {
  try {
    const { prompt = "", text = "" } = req.body;

    if (!prompt.trim() || !text.trim()) {
      return res.status(400).json({ message: "Prompt and text are required" });
    }

    const aiPrompt = `
You are an English writing teacher.
Evaluate the student's answer and return ONLY valid JSON.

Required JSON shape:
{
  "prompt": "string",
  "userText": "string",
  "feedback": {
    "grammar": "string",
    "vocabulary": "string",
    "style": "string",
    "overallComment": "string"
  },
  "score": {
    "grammar": 1,
    "vocabulary": 1,
    "style": 1,
    "overall": 1
  },
  "suggestions": ["string", "string", "string"],
  "improvedVersion": "string"
}

Rules:
- Scores must be integers from 1 to 10.
- Give exactly 3 suggestions.
- Keep feedback friendly and easy to understand.
- improvedVersion should be a better version of the student's text.
- Do not wrap JSON in markdown.
- Focus only on English grammar, vocabulary, style, and clarity.

Writing prompt:
${prompt}

Student answer:
${text}
    `.trim();

    const raw = await generateStructuredJson(aiPrompt);
    const response = normalizeEvaluationResponse(raw, prompt, text);

    res.json(response);
  } catch (error) {
    console.error("evaluateWritingPrompt error:", error.message);
    res.status(500).json({
      message: "Real AI evaluation failed",
      error: error.message,
    });
  }
}