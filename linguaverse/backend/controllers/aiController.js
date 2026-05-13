import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI = null;

function getGenAI() {
  if (genAI) return genAI;

  if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY не знайдено в .env");
    return null;
  }

  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  console.log("✅ Gemini AI initialized");

  return genAI;
}

function getMockReply(message) {
  return `Я отримав ваш запит: "${message}". Але зараз AI працює в резервному режимі.`;
}

function buildPrompt(message, contextText, roomText, mode) {
  return `
Ти високорівневий AI-викладач іноземних мов у платформі LinguaVerse.

ТВОЯ РОЛЬ:
- професійний викладач англійської мови
- помічник з граматики
- перекладач
- тренер словникового запасу
- пояснювач помилок
- співрозмовник для мовної практики
- академічний мовний консультант

ПРАВИЛА:
- Відповідай мовою користувача.
- Якщо користувач явно просить іншу мову — відповідай нею.
- Якщо просять слова певною мовою — ОБОВ'ЯЗКОВО давай саме тією мовою.
- Не ігноруй формат запиту.

ЯК ВІДПОВІДАТИ:
- Будь розумним, точним, структурованим.
- Не давай коротких тупих шаблонних відповідей.
- Якщо користувач просить список слів → формат:
  слово | переклад | пояснення | приклад
- Якщо користувач просить граматику → пояснюй детально + приклади.
- Якщо користувач пише з помилками → виправ + поясни.
- Якщо користувач просить переклад → природний переклад.
- Якщо академічна тема → точна серйозна відповідь.
- Якщо складна тема → пояснюй доступно.
- Якщо користувач просить багато деталей → давай багато деталей.

ЗАБОРОНЕНО:
- вигадувати факти
- відповідати поверхнево
- ігнорувати інструкцію користувача
- писати не тією мовою

Режим:
${mode}

Контекст кімнати:
${roomText || "немає"}

Попередній чат:
${contextText || "немає"}

Запит користувача:
${message}
`;
}

async function tryModels(ai, prompt) {
  const models = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-1.5-flash",
  ];

  let lastError = null;

  for (const modelName of models) {
    try {
      console.log(`🤖 Trying model: ${modelName}`);

      const model = ai.getGenerativeModel({
        model: modelName,
        generationConfig: {
          maxOutputTokens: 1500,
          temperature: 0.45,
          topP: 0.9,
          topK: 40,
        },
      });

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      lastError = error;
      console.warn(`❌ ${modelName} failed: ${error.message}`);
    }
  }

  throw lastError;
}

export const chatWithAI = async (req, res) => {
  try {
    const {
      message,
      context = [],
      mode = "general-assistant",
      room = null,
    } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        message: "Message is required",
      });
    }

    const ai = getGenAI();

    if (!ai) {
      return res.json({
        reply: getMockReply(message),
      });
    }

    const contextText = Array.isArray(context)
      ? context
          .slice(-8)
          .map((msg) => `${msg.user || "User"}: ${msg.text || ""}`)
          .join("\n")
      : "";

    const roomText = room
      ? `
Назва: ${room.title || "Без назви"}
Мова: ${room.language || "English"}
Рівень: ${room.level || "A1"}
Тема: ${room.topic || "General"}
`
      : "";

    const prompt = buildPrompt(
      message,
      contextText,
      roomText,
      mode
    );

    const reply = await tryModels(ai, prompt);

    return res.json({ reply });
  } catch (error) {
    console.error("Gemini API error:", error);

    if (error?.status === 503) {
      return res.json({
        reply:
          "AI зараз тимчасово перевантажений через велику кількість запитів. Спробуйте ще раз через кілька секунд.",
      });
    }

    return res.json({
      reply:
        "Сталася технічна помилка AI. Спробуйте ще раз.",
    });
  }
};