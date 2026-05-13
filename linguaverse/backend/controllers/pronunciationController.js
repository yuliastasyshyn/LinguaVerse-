import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI = null;

function getGenAI() {
  if (genAI) return genAI;

  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log("✅ Pronunciation Gemini initialized");
  } else {
    console.warn("⚠️ GEMINI_API_KEY not set — pronunciation will use mock feedback");
  }

  return genAI;
}

const normalizeText = (text = "") =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const levenshteinDistance = (a = "", b = "") => {
  const matrix = Array.from({ length: b.length + 1 }, () =>
    new Array(a.length + 1).fill(0)
  );

  for (let i = 0; i <= b.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[b.length][a.length];
};

const getSimilarity = (targetText, spokenText) => {
  const target = normalizeText(targetText);
  const spoken = normalizeText(spokenText);

  if (!target || !spoken) return 0;
  if (target === spoken) return 100;

  const distance = levenshteinDistance(target, spoken);
  const maxLength = Math.max(target.length, spoken.length);

  return Math.max(0, Math.round((1 - distance / maxLength) * 100));
};

const getStatus = (score) => {
  if (score >= 90) return "excellent";
  if (score >= 75) return "good";
  if (score >= 55) return "average";
  return "try_again";
};

const getMockFeedback = ({ targetText, spokenText, score }) => {
  if (!spokenText) {
    return {
      feedback: "Я не зміг оцінити вимову, бо текст не був розпізнаний.",
      tips: [
        "Говоріть повільніше",
        "Перевірте доступ до мікрофона",
        "Повторіть слово ще раз",
      ],
    };
  }

  if (score >= 90) {
    return {
      feedback: `Чудово! Вимова дуже близька до еталонного варіанта "${targetText}".`,
      tips: [
        "Можете переходити до наступного слова",
        "Спробуйте повторити слово ще раз у швидшому темпі",
      ],
    };
  }

  if (score >= 75) {
    return {
      feedback: `Непогано. Є невелика різниця між еталоном "${targetText}" і тим, що було розпізнано як "${spokenText}".`,
      tips: [
        "Прослухайте слово ще раз",
        "Спробуйте вимовити слово повільніше",
        "Зверніть увагу на останній звук",
      ],
    };
  }

  return {
    feedback: `Потрібно ще потренуватися. Розпізнано "${spokenText}", а очікувалось "${targetText}".`,
    tips: [
      "Розбийте слово на частини",
      "Повторіть після еталонної вимови",
      "Сконцентруйтесь на кожному звуці окремо",
    ],
  };
};

const parseGeminiJson = (text = "") => {
  try {
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
};

const getAiFeedback = async ({ targetText, spokenText, translation, score }) => {
  const ai = getGenAI();

  if (!ai) {
    return getMockFeedback({ targetText, spokenText, score });
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Ти є AI-викладачем англійської вимови.

Проаналізуй різницю між еталонним текстом і текстом, який система розпізнала з голосу користувача.

Поверни ТІЛЬКИ JSON без пояснень поза JSON у такому форматі:
{
  "feedback": "коротке пояснення українською мовою",
  "tips": ["порада 1", "порада 2", "порада 3"]
}

Умови:
- Відповідь українською мовою.
- Дуже коротко і зрозуміло.
- Не вигадуй фонетичні деталі, якщо їх не можна надійно визначити.
- Спирайся тільки на різницю між targetText і spokenText.
- Максимум 3 поради.

targetText: "${targetText}"
spokenText: "${spokenText}"
translation: "${translation || ""}"
score: ${score}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = parseGeminiJson(text);

    if (parsed?.feedback && Array.isArray(parsed?.tips)) {
      return parsed;
    }

    return getMockFeedback({ targetText, spokenText, score });
  } catch (error) {
    console.error("Pronunciation Gemini error:", error);
    return getMockFeedback({ targetText, spokenText, score });
  }
};

export const evaluatePronunciation = async (req, res) => {
  try {
    const { targetText, spokenText, translation } = req.body;

    if (!targetText || !spokenText) {
      return res.status(400).json({
        error: "targetText and spokenText are required",
      });
    }

    const score = getSimilarity(targetText, spokenText);
    const status = getStatus(score);
    const aiFeedback = await getAiFeedback({
      targetText,
      spokenText,
      translation,
      score,
    });

    return res.status(200).json({
      targetText,
      spokenText,
      score,
      status,
      feedback: aiFeedback.feedback,
      tips: aiFeedback.tips,
    });
  } catch (error) {
    console.error("evaluatePronunciation error:", error);
    return res.status(500).json({
      error: "Failed to evaluate pronunciation",
    });
  }
};