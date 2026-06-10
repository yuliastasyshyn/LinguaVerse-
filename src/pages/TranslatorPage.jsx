import { useState } from "react";
import "./TranslatorPage.css";

const escapeRegExp = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeExamples = (examples) => {
  if (Array.isArray(examples)) {
    return examples
      .map((item) => {
        if (typeof item === "string") return item;
        return item.example || item.sentence || item.text || "";
      })
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof examples === "string") {
    return examples
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeSynonyms = (synonyms) => {
  if (!Array.isArray(synonyms)) return [];

  return synonyms
    .map((item) => {
      if (typeof item === "string") {
        const parts = item.split(/\s*[—-]\s*/);

        return {
          word: parts[0]?.trim() || "",
          translation: parts.slice(1).join(" — ").trim() || "",
        };
      }

      return {
        word:
          item.word ||
          item.synonym ||
          item.text ||
          item.name ||
          "",
        translation:
          item.translation ||
          item.meaning ||
          item.translated ||
          item.uk ||
          "",
      };
    })
    .filter((item) => item.word);
};

const renderHighlightedText = (sentence = "", phrase = "") => {
  const text = String(sentence);
  const cleanPhrase = String(phrase || "").trim();

  if (!cleanPhrase) return text;

  const words = cleanPhrase
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 1);

  const patterns = [cleanPhrase, ...words]
    .filter(Boolean)
    .map(escapeRegExp);

  const uniquePatterns = [...new Set(patterns)].sort(
    (a, b) => b.length - a.length
  );

  if (!uniquePatterns.length) return text;

  const splitRegex = new RegExp(`(${uniquePatterns.join("|")})`, "gi");
  const checkRegex = new RegExp(`^(${uniquePatterns.join("|")})$`, "i");

  return text.split(splitRegex).map((part, index) => {
    if (checkRegex.test(part)) {
      return (
        <mark key={index} className="context-highlight">
          {part}
        </mark>
      );
    }

    return part;
  });
};

export default function TranslatorPage() {
  const [text, setText] = useState("");
  const [translated, setTranslated] = useState("");
  const [fromLang, setFromLang] = useState("uk");
  const [toLang, setToLang] = useState("en");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [examples, setExamples] = useState([]);
  const [synonyms, setSynonyms] = useState([]);
  const [loadingExamples, setLoadingExamples] = useState(false);
  const [contextTitle, setContextTitle] = useState("Пошук контексту");
  const [contextPhrase, setContextPhrase] = useState("");

  const translateSynonym = async ({ word, from, to }) => {
    if (!word || !from || !to || from === to) return "";

    try {
      const response = await fetch("http://localhost:4000/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: word,
          fromLang: from,
          toLang: to,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        return data.translation || "";
      }

      return "";
    } catch (error) {
      console.error("Synonym translation error:", error);
      return "";
    }
  };

  const handleTranslate = async () => {
    if (!text.trim()) return;

    try {
      setLoading(true);
      setExamples([]);
      setSynonyms([]);
      setContextPhrase("");
      setContextTitle("Пошук контексту");

      const response = await fetch("http://localhost:4000/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          fromLang,
          toLang,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const translatedText = data.translation || "";

        setTranslated(translatedText);
        setContextPhrase(translatedText);
        setMessage("");

        getContextExamples(translatedText, toLang);
      } else {
        alert(data.message || data.error || "Помилка перекладу");
      }
    } catch (error) {
      console.error(error);
      alert("Помилка сервера");
    } finally {
      setLoading(false);
    }
  };

  const getContextExamples = async (translatedPhrase, language) => {
    if (!translatedPhrase?.trim()) return;

    try {
      setLoadingExamples(true);

      const response = await fetch("http://localhost:4000/api/translate/context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          translatedPhrase,
          phrase: translatedPhrase,
          language,
          synonymTranslationLang: fromLang,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setContextTitle("Приклади використання та синоніми:");

        const preparedExamples = normalizeExamples(data.examples);
        setExamples(preparedExamples);

        const preparedSynonyms = normalizeSynonyms(data.synonyms);

        const synonymsWithTranslations = await Promise.all(
          preparedSynonyms.slice(0, 10).map(async (item) => {
            if (item.translation) return item;

            const translation = await translateSynonym({
              word: item.word,
              from: language,
              to: fromLang,
            });

            return {
              ...item,
              translation,
            };
          })
        );

        setSynonyms(synonymsWithTranslations);
      } else {
        setExamples([data.error || "Не вдалося отримати приклади"]);
        setSynonyms([]);
        setContextTitle("Помилка пошуку контексту");
        console.error("Context API error:", data);
      }
    } catch (error) {
      console.error("Context error:", error);
      setExamples(["Помилка контексту"]);
      setSynonyms([]);
      setContextTitle("Помилка пошуку контексту");
    } finally {
      setLoadingExamples(false);
    }
  };

  const handleAddToDictionary = async () => {
    if (!text.trim() || !translated.trim()) {
      setMessage("Спочатку перекладіть слово");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await fetch("http://localhost:4000/api/dictionary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          word: text.trim(),
          translation: translated.trim(),
        }),
      });

      if (response.ok) {
        setMessage("✓ Додано до словника!");
        setTimeout(() => setMessage(""), 2000);
      } else {
        const data = await response.json();
        setMessage("✗ " + (data.error || "Помилка"));
      }
    } catch (error) {
      console.error(error);
      setMessage("✗ Помилка сервера");
    }
  };

  return (
    <div className="translator-page">
      <div className="translator-card">
        <h1>Перекладач</h1>

        <div className="language-row">
          <div>
            <label>З мови</label>

            <select
              value={fromLang}
              onChange={(e) => setFromLang(e.target.value)}
            >
              <option value="uk">Українська</option>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
              <option value="it">Italiano</option>
              <option value="pl">Polski</option>
            </select>
          </div>

          <div>
            <label>На мову</label>

            <select
              value={toLang}
              onChange={(e) => setToLang(e.target.value)}
            >
              <option value="uk">Українська</option>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
              <option value="it">Italiano</option>
              <option value="pl">Polski</option>
            </select>
          </div>
        </div>

        <div className="translator-boxes">
          <textarea
            placeholder="Введіть текст..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div className="translation-wrapper">
            <textarea
              placeholder="Тут буде переклад..."
              value={translated}
              readOnly
            />

            {(examples.length > 0 || synonyms.length > 0 || loadingExamples) && (
              <div className="examples-box">
                <h3>💡 {contextTitle}</h3>

                <div className="examples-content">
                  {loadingExamples ? (
                    <p className="examples-loading">Завантаження...</p>
                  ) : (
                    <>
                      {examples.length > 0 && (
                        <div className="examples-section">
                          <h4>Приклади:</h4>

                          <ul className="examples-list">
                            {examples.map((example, index) => (
                              <li key={index}>
                                {renderHighlightedText(
                                  example,
                                  contextPhrase || translated
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {synonyms.length > 0 && (
                        <div className="synonyms-section">
                          <h4>Синоніми:</h4>

                          <ul className="synonyms-list">
                            {synonyms.map((synonym, index) => (
                              <li key={index} className="synonym-row">
                                <span className="synonym-word">
                                  {synonym.word}
                                </span>

                                <span className="synonym-arrow">—</span>

                                <span className="synonym-translation">
                                  {synonym.translation || "переклад не знайдено"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="button-group">
          <button
            onClick={handleTranslate}
            className="btn-translate"
            disabled={loading || !text.trim()}
          >
            {loading ? "Переклад..." : "Перекласти"}
          </button>

          {translated && (
            <button onClick={handleAddToDictionary} className="btn-add-dict">
              ★ Додати до словника
            </button>
          )}
        </div>

        {message && (
          <div className={`message ${message.includes("✓") ? "success" : "error"}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}