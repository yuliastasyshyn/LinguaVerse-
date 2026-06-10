import { useState } from "react";
import "./TranslatorPage.css";

export default function TranslatorPage() {
  const [text, setText] = useState("");
  const [translated, setTranslated] = useState("");
  const [fromLang, setFromLang] = useState("uk");
  const [toLang, setToLang] = useState("en");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [examples, setExamples] = useState("");
  const [loadingExamples, setLoadingExamples] = useState(false);
  const [contextTitle, setContextTitle] = useState("Пошук контексту");

  const handleTranslate = async () => {
    if (!text.trim()) return;

    try {
      setLoading(true);
      setExamples("");

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
        setTranslated(data.translation);
        setMessage("");
        
        
        getContextExamples(text, toLang);
      } else {
        alert(data.message || "Помилка перекладу");
      }
    } catch (error) {
      console.error(error);
      alert("Помилка сервера");
    } finally {
      setLoading(false);
    }
  };

  const getContextExamples = async (phrase, language) => {
    try {
      setLoadingExamples(true);
      const response = await fetch("http://localhost:4000/api/translate/context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phrase,
          language,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setExamples(data.examples);
        setContextTitle("Приклади використання:");
      } else {
        const data = await response.json();
        setExamples(data.error || "Не вдалося отримати приклади");
        setContextTitle("Помилка пошуку контексту");
        console.error("Context API error:", data);
      }
    } catch (error) {
      console.error("Context error:", error);
      setExamples("Помилка контексту");
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
          "Authorization": `Bearer ${token}`,
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
            {(examples || loadingExamples) && (
              <div className="examples-box">
                <h3>💡 {contextTitle}</h3>
                <div className="examples-content">
                  {loadingExamples ? "Завантаження..." : examples}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="button-group">
          <button onClick={handleTranslate} className="btn-translate">
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