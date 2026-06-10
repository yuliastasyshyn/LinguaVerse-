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

const getDifferenceExplanation = (targetText = "", spokenText = "") => {
  const target = normalizeText(targetText);
  const spoken = normalizeText(spokenText);

  if (!spoken) {
    return "Система не змогла розпізнати сказане слово, тому порівняння виконати неможливо.";
  }

  if (target === spoken) {
    return `Система розпізнала слово "${spokenText}" правильно. Воно повністю збігається з еталонним словом "${targetText}".`;
  }

  if (spoken.startsWith(target) && spoken.length > target.length) {
    const extraPart = spoken.slice(target.length);

    return `Система розпізнала слово як "${spokenText}". Воно дуже схоже на еталон "${targetText}", але наприкінці з’явилась зайва частина "${extraPart}". Через це слово було сприйняте як інша форма.`;
  }

  if (target.startsWith(spoken) && target.length > spoken.length) {
    const missingPart = target.slice(spoken.length);

    return `Система розпізнала "${spokenText}", але еталонне слово — "${targetText}". Схоже, наприкінці не вистачає частини "${missingPart}", тому слово прозвучало не повністю.`;
  }

  const targetWords = target.split(" ");
  const spokenWords = spoken.split(" ");

  if (targetWords.length !== spokenWords.length) {
    return `Система розпізнала "${spokenText}" замість "${targetText}". Кількість або форма слів відрізняється, тому оцінка знизилась.`;
  }

  return `Система розпізнала "${spokenText}" замість "${targetText}". Це означає, що вимова частково відрізняється від еталонного слова.`;
};

const getMockFeedback = ({ targetText, spokenText, score }) => {
  const explanation = getDifferenceExplanation(targetText, spokenText);

  if (!spokenText) {
    return {
      feedback: "Текст не був розпізнаний. Спробуйте повторити слово ще раз.",
      tips: [
        "Перевірте, чи дозволено доступ до мікрофона",
        "Говоріть трохи голосніше",
        "Вимовте слово повільніше і чіткіше",
      ],
    };
  }

  if (score >= 90) {
    return {
      feedback: `Чудово! ${explanation}`,
      tips: [
        "Вимова дуже близька до правильної",
        "Можете переходити до наступного слова",
        "Для закріплення повторіть слово ще раз",
      ],
    };
  }

  if (score >= 75) {
    return {
      feedback: `Добре! ${explanation}`,
      tips: [
        "Прослухайте еталонне слово ще раз",
        "Зверніть увагу на закінчення слова",
        "Повторіть слово повільніше",
      ],
    };
  }

  if (score >= 55) {
    return {
      feedback: `Непогано, але потрібно ще потренуватися. ${explanation}`,
      tips: [
        "Розбийте слово на частини",
        "Спочатку вимовляйте повільно",
        "Порівняйте свою вимову з еталоном",
      ],
    };
  }

  return {
    feedback: `Потрібно повторити ще раз. ${explanation}`,
    tips: [
      "Прослухайте правильну вимову",
      "Повторіть слово повільно",
      "Спробуйте вимовити кожну частину слова чіткіше",
    ],
  };
};

const parseGeminiJson = (text = "") => {
  try {
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

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

Потрібно пояснити користувачу результат перевірки вимови.

Порівняй:
- еталонне слово;
- слово, яке розпізнала система;
- оцінку у відсотках.

Поверни ТІЛЬКИ JSON без будь-якого тексту поза JSON.

Формат відповіді:
{
  "feedback": "конкретне пояснення українською мовою",
  "tips": ["порада 1", "порада 2", "порада 3"]
}

Правила:
- Пиши українською мовою.
- Пояснення має бути коротким, але змістовним.
- Обов’язково вкажи, яке слово було розпізнано.
- Якщо розпізнане слово має зайве закінчення, поясни це.
- Якщо частину слова пропущено, поясни це.
- Якщо слово дуже схоже на еталон, напиши, що помилка невелика.
- Не використовуй складні фонетичні терміни.
- Не вигадуй того, чого не видно з порівняння targetText і spokenText.
- Максимум 3 короткі поради.

Еталонне слово: "${targetText}"
Розпізнано системою: "${spokenText}"
Переклад: "${translation || ""}"
Оцінка: ${score}
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