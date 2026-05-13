import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI = null;

function getModel() {
  if (!process.env.GEMINI_API_KEY) return null;

  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}

function safeJsonParse(text) {
  try {
    let cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      cleaned = cleaned.slice(first, last + 1);
    }

    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function splitSentences(text = "") {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildMockMistakes(text) {
  const correctionsMap = [
    {
      regex: /\bgoed\b/gi,
      correct: "went",
      explanation: "У Past Simple дієслово 'go' має форму 'went'.",
    },
    {
      regex: /\bI am agree\b/gi,
      correct: "I agree",
      explanation: "В англійській кажуть 'I agree', без 'am'.",
    },
    {
      regex: /\bhe go\b/gi,
      correct: "he goes",
      explanation: "Для he/she/it у Present Simple до дієслова додається -s.",
    },
    {
      regex: /\bshe go\b/gi,
      correct: "she goes",
      explanation: "Для he/she/it у Present Simple до дієслова додається -s.",
    },
    {
      regex: /\bthey is\b/gi,
      correct: "they are",
      explanation: "Для 'they' потрібно використовувати 'are'.",
    },
    {
      regex: /\ban informations\b/gi,
      correct: "information",
      explanation: "'Information' є незлічуваним іменником і не має форми множини тут.",
    },
    {
      regex: /\banywey\b/gi,
      correct: "anyway",
      explanation: "Правильне слово — 'anyway'.",
    },
    {
      regex: /\bexited\b/gi,
      correct: "excited",
      explanation: "Правильне слово — 'excited', а не 'exited'.",
    },
    {
      regex: /\bbat\b/gi,
      correct: "but",
      explanation: "Правильна сполучка — 'but', якщо йдеться про 'але'.",
    },
    {
      regex: /\brecieve\b/gi,
      correct: "receive",
      explanation: "Правильне написання — 'receive'.",
    },
    {
      regex: /\bdefinately\b/gi,
      correct: "definitely",
      explanation: "Правильне написання — 'definitely'.",
    },
    {
      regex: /\bthier\b/gi,
      correct: "their",
      explanation: "Правильне слово — 'their'.",
    },
    {
      regex: /\byoure\b/gi,
      correct: "you're",
      explanation: "Правильне скорочення — 'you're'.",
    },
    {
      regex: /\bto\b/gi,
      correct: "to",
      explanation: "Перевір, чи 'to' використано правильно у реченні.",
    },
    {
      regex: /\banyway\b/gi,
      correct: "anyway",
      explanation: "Слово 'anyway' використовується для позначення 'в будь-якому разі'.",
    },
  ];

  const mistakes = [];
  let corrected = text;

  correctionsMap.forEach((item) => {
    corrected = corrected.replace(item.regex, (match) => {
      if (match.toLowerCase() === item.correct.toLowerCase()) {
        return match;
      }
      mistakes.push({
        original: match,
        correct: item.correct,
        explanation: item.explanation,
      });
      return item.correct;
    });
  });

  return { mistakes, corrected };
}

function buildMockCheckResponse(text) {
  const { mistakes, corrected } = buildMockMistakes(text);
  const improvedText = corrected.length
    ? `${corrected.trim()}${/[.!?]$/.test(corrected.trim()) ? "" : "."} I am continuing to improve my English writing skills.`
    : "";

  return {
    originalText: text,
    correctedText: corrected,
    improvedText,
    score: {
      grammar: Math.max(5, 9 - mistakes.length),
      vocabulary: 7,
      clarity: 8,
      overall: Math.max(5, 8 - Math.min(mistakes.length, 3)),
    },
    mistakes:
      mistakes.length > 0
        ? mistakes
        : [
            {
              original: "—",
              correct: "—",
              explanation:
                "Явних типових помилок не знайдено. Для повноцінного аналізу додай Gemini API key.",
            },
          ],
    summary:
      mistakes.length > 0
        ? "Текст перевірено в демо-режимі. Знайдено кілька базових граматичних помилок."
        : "Текст перевірено в демо-режимі. Критичних типових помилок не знайдено.",
  };
}

function buildMockEvaluation(prompt, text) {
  const { mistakes, corrected } = buildMockMistakes(text);
  const sentenceCount = splitSentences(text).length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return {
    prompt,
    userText: text,
    feedback: {
      grammar:
        mistakes.length > 0
          ? "Є кілька базових граматичних помилок. Зверни увагу на часи та форми дієслів."
          : "Текст загалом граматично зрозумілий.",
      vocabulary:
        wordCount < 30
          ? "Словниковий запас поки простий. Спробуй додати більше прикметників і дієслів."
          : "Словниковий запас достатній, але можна додати ще різноманітніші слова.",
      style:
        sentenceCount < 3
          ? "Відповідь занадто коротка. Додай вступ, деталі й завершення."
          : "Стиль зрозумілий, але можна зробити текст більш зв'язним.",
      overallComment:
        "Хороший початок. Розкрий тему докладніше, використовуй більше деталей і перевір часові форми.",
    },
    score: {
      grammar: Math.max(5, 9 - mistakes.length),
      vocabulary: wordCount >= 40 ? 8 : wordCount >= 20 ? 7 : 6,
      style: sentenceCount >= 4 ? 8 : sentenceCount >= 2 ? 7 : 6,
      overall: Math.max(5, 8 - Math.min(mistakes.length, 2)),
    },
    suggestions: [
      "Додай більше конкретних деталей до відповіді.",
      "Використай різні часові форми там, де це доречно.",
      "Спробуй зробити речення трохи довшими і більш зв'язними.",
    ],
    improvedVersion:
      corrected.trim().length > 0
        ? `${corrected.trim()} I added a few more details to make the response clearer and more engaging.`
        : "",
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

async function generateStructuredJson(prompt, fallbackFactory) {
  const model = getModel();

  if (!model) {
    return fallbackFactory();
  }

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = safeJsonParse(text);

    if (!parsed) {
      return fallbackFactory();
    }

    return parsed;
  } catch (error) {
    console.error("Writing AI error:", error.message);
    return fallbackFactory();
  }
}

export async function getWritingPrompts(req, res) {
  res.json({ prompts: PROMPTS });
}

export async function checkWriting(req, res) {
  const { text = "" } = req.body;

  if (!text.trim()) {
    return res.status(400).json({ message: "Text is required" });
  }

  const prompt = `You are an English writing assistant. Analyze the student's text and return ONLY valid JSON with this exact shape:
{
  "originalText": string,
  "correctedText": string,
  "improvedText": string,
  "score": { "grammar": number, "vocabulary": number, "clarity": number, "overall": number },
  "mistakes": [{ "original": string, "correct": string, "explanation": string }],
  "summary": string
}

Rules:
- Keep explanations simple for language learners.
- Scores must be integers from 1 to 10.
- correctedText should fix grammar but keep the original meaning.
- improvedText should sound more natural and polished.
- Return 1 to 8 mistakes maximum.
- Do not wrap JSON in markdown.
- IGNORE URLs, links, and technical references - do not try to "correct" them.
- Focus only on English grammar, vocabulary, and writing style.
- Leave URLs and links unchanged in correctedText and improvedText.

Student text:
${text}`;

  const response = await generateStructuredJson(prompt, () => buildMockCheckResponse(text));
  res.json(response);
}

export async function evaluateWritingPrompt(req, res) {
  const { prompt = "", text = "" } = req.body;

  if (!prompt.trim() || !text.trim()) {
    return res.status(400).json({ message: "Prompt and text are required" });
  }

  const aiPrompt = `You are an English writing teacher. Evaluate the student's answer and return ONLY valid JSON in this exact shape:
{
  "prompt": string,
  "userText": string,
  "feedback": {
    "grammar": string,
    "vocabulary": string,
    "style": string,
    "overallComment": string
  },
  "score": {
    "grammar": number,
    "vocabulary": number,
    "style": number,
    "overall": number
  },
  "suggestions": [string],
  "improvedVersion": string
}

Rules:
- Scores must be integers from 1 to 10.
- Keep feedback friendly and easy to understand.
- Give exactly 3 suggestions.
- improvedVersion should be a better version of the student's answer.
- Do not wrap JSON in markdown.
- IGNORE URLs, links, and technical references - do not try to "correct" them.
- Focus only on English grammar, vocabulary, and writing style.
- Leave URLs and links unchanged in improvedVersion.

Writing prompt:
${prompt}

Student answer:
${text}`;

  const response = await generateStructuredJson(aiPrompt, () => buildMockEvaluation(prompt, text));
  res.json(response);
}
