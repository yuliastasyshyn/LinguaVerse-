import { useEffect, useMemo, useState } from "react";
import "./WritingPage.css";

const API_BASE = "http://localhost:4000/api/writing";

const emptyCheckResult = null;
const emptyPracticeResult = null;

export default function WritingPage() {
  const token = localStorage.getItem("token");

  const [activeTab, setActiveTab] = useState("checker");
  const [checkerText, setCheckerText] = useState("");
  const [checkerResult, setCheckerResult] = useState(emptyCheckResult);
  const [checkerLoading, setCheckerLoading] = useState(false);
  const [checkerError, setCheckerError] = useState("");

  const [prompts, setPrompts] = useState([]);
  const [promptsLoading, setPromptsLoading] = useState(true);
  const [practiceText, setPracticeText] = useState("");
  const [practiceResult, setPracticeResult] = useState(emptyPracticeResult);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceError, setPracticeError] = useState("");
  const [selectedPromptId, setSelectedPromptId] = useState(1);

  useEffect(() => {
    fetchPrompts();
  }, []);

  const selectedPrompt = useMemo(
    () => prompts.find((item) => item.id === Number(selectedPromptId)) || prompts[0],
    [prompts, selectedPromptId]
  );

  async function fetchPrompts() {
    try {
      setPromptsLoading(true);
      const res = await fetch(`${API_BASE}/prompts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Не вдалося завантажити теми");

      setPrompts(data.prompts || []);
      if (data.prompts?.length) {
        setSelectedPromptId(data.prompts[0].id);
      }
    } catch (error) {
      setPracticeError(error.message || "Не вдалося завантажити теми.");
    } finally {
      setPromptsLoading(false);
    }
  }

  async function handleCheckWriting() {
    setCheckerError("");
    setCheckerResult(null);

    if (!checkerText.trim()) {
      setCheckerError("Введи текст для перевірки.");
      return;
    }

    try {
      setCheckerLoading(true);
      const res = await fetch(`${API_BASE}/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: checkerText }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Не вдалося перевірити текст.");
      setCheckerResult(data);
    } catch (error) {
      setCheckerError(error.message || "Сталася помилка під час перевірки.");
    } finally {
      setCheckerLoading(false);
    }
  }

  async function handleEvaluatePrompt() {
    setPracticeError("");
    setPracticeResult(null);

    if (!selectedPrompt?.text) {
      setPracticeError("Спочатку завантаж теми.");
      return;
    }

    if (!practiceText.trim()) {
      setPracticeError("Напиши відповідь на тему.");
      return;
    }

    try {
      setPracticeLoading(true);
      const res = await fetch(`${API_BASE}/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: selectedPrompt.text,
          text: practiceText,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Не вдалося оцінити текст.");
      setPracticeResult(data);
    } catch (error) {
      setPracticeError(error.message || "Сталася помилка під час оцінювання.");
    } finally {
      setPracticeLoading(false);
    }
  }

  return (
    <div className="writing-page">
      <section className="writing-hero">
        <div>
          <p className="writing-badge">LinguaVerse • Writing Lab</p>
          <h1>Практика письма з AI</h1>
          <p className="writing-hero-text">
            Перевіряй свої тексти, отримуй пояснення помилок і тренуйся писати за готовими темами.
          </p>
        </div>
        <div className="writing-hero-stats">
          <div className="mini-stat-card">
            <span>2</span>
            <p>режими письма</p>
          </div>
          <div className="mini-stat-card">
            <span>AI</span>
            <p>аналіз і фідбек</p>
          </div>
        </div>
      </section>

      <div className="writing-tabs">
        <button
          className={activeTab === "checker" ? "tab-button active" : "tab-button"}
          onClick={() => setActiveTab("checker")}
        >
          AI-перевірка тексту
        </button>
        <button
          className={activeTab === "practice" ? "tab-button active" : "tab-button"}
          onClick={() => setActiveTab("practice")}
        >
          Writing за підказкою
        </button>
      </div>

      {activeTab === "checker" ? (
        <section className="writing-grid">
          <div className="writing-card">
            <div className="card-header-row">
              <h2>Напиши свій текст</h2>
              <span className="soft-chip">Grammar • Style • Clarity</span>
            </div>

            <textarea
              className="writing-textarea"
              placeholder="Наприклад: I goed to school yesterday and I am agree with my teacher..."
              value={checkerText}
              onChange={(e) => setCheckerText(e.target.value)}
            />

            <div className="action-row">
              <button className="primary-writing-btn" onClick={handleCheckWriting} disabled={checkerLoading}>
                {checkerLoading ? "AI аналізує..." : "Перевірити текст"}
              </button>
              <button
                className="secondary-writing-btn"
                onClick={() => {
                  setCheckerText("");
                  setCheckerResult(null);
                  setCheckerError("");
                }}
              >
                Очистити
              </button>
            </div>

            {checkerError && <p className="writing-error">{checkerError}</p>}
          </div>

          <div className="writing-card results-card">
            <h2>Результат перевірки</h2>
            {checkerResult?.demoMode === true && (
              <p className="writing-warning">
                Зараз використовується демо-режим перевірки. Для реального Gemini AI потрібно підключити Gemini API key на бекенді.
              </p>
            )}
            {checkerResult?.realAI === true && (
              <p className="writing-success">Працює реальний Gemini AI.</p>
            )}
            {!checkerResult ? (
              <div className="empty-state">
                <p>Тут з’являться виправлення, пояснення помилок і покращений варіант тексту.</p>
              </div>
            ) : (
              <>
                <div className="score-grid">
                  <ScoreBox label="Grammar" value={checkerResult.score?.grammar} />
                  <ScoreBox label="Vocabulary" value={checkerResult.score?.vocabulary} />
                  <ScoreBox label="Clarity" value={checkerResult.score?.clarity} />
                  <ScoreBox label="Overall" value={checkerResult.score?.overall} />
                </div>

                <ResultBlock title="Corrected version" text={checkerResult.correctedText} />
                <ResultBlock title="Improved version" text={checkerResult.improvedText} />

                <div className="result-block">
                  <h3>Пояснення помилок</h3>
                  <div className="mistakes-list">
                    {(checkerResult.mistakes || []).map((item, index) => (
                      <div className="mistake-item" key={`${item.original}-${index}`}>
                        <div className="mistake-top-row">
                          <span className="mistake-old">{item.original}</span>
                          <span className="mistake-arrow">→</span>
                          <span className="mistake-new">{item.correct}</span>
                        </div>
                        <p>{item.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {checkerResult.summary && <p className="summary-box">{checkerResult.summary}</p>}
              </>
            )}
          </div>
        </section>
      ) : (
        <section className="writing-grid practice-layout">
          <div className="writing-card">
            <div className="card-header-row">
              <h2>Обери тему</h2>
              <span className="soft-chip">Prompt Writing</span>
            </div>

            {promptsLoading ? (
              <p>Завантаження тем...</p>
            ) : (
              <>
                <div className="prompt-list">
                  {prompts.map((prompt) => (
                    <button
                      key={prompt.id}
                      className={Number(selectedPromptId) === prompt.id ? "prompt-card active" : "prompt-card"}
                      onClick={() => setSelectedPromptId(prompt.id)}
                    >
                      <div className="prompt-card-top">
                        <span className="prompt-level">{prompt.level}</span>
                        <span className="prompt-type">{prompt.type}</span>
                      </div>
                      <p>{prompt.text}</p>
                    </button>
                  ))}
                </div>

                <div className="current-prompt-box">
                  <h3>Поточна тема</h3>
                  <p>{selectedPrompt?.text || "Тема недоступна"}</p>
                </div>

                <textarea
                  className="writing-textarea"
                  placeholder="Напиши відповідь на вибрану тему..."
                  value={practiceText}
                  onChange={(e) => setPracticeText(e.target.value)}
                />

                <div className="action-row">
                  <button className="primary-writing-btn" onClick={handleEvaluatePrompt} disabled={practiceLoading}>
                    {practiceLoading ? "AI оцінює..." : "Надіслати на перевірку"}
                  </button>
                  <button
                    className="secondary-writing-btn"
                    onClick={() => {
                      setPracticeText("");
                      setPracticeResult(null);
                      setPracticeError("");
                    }}
                  >
                    Очистити
                  </button>
                </div>
              </>
            )}

            {practiceError && <p className="writing-error">{practiceError}</p>}
          </div>

          <div className="writing-card results-card">
            <h2>AI feedback</h2>
            {practiceResult?.demoMode === true && (
              <p className="writing-warning">
                Зараз використовується демо-режим. Щоб працював реальний AI, додай Gemini API key на бекенді.
              </p>
            )}
            {practiceResult?.realAI === true && (
              <p className="writing-success">Працює реальний Gemini AI.</p>
            )}
            {!practiceResult ? (
              <div className="empty-state">
                <p>Після перевірки тут з’являться оцінки, поради та покращена версія відповіді.</p>
              </div>
            ) : (
              <>
                <div className="score-grid">
                  <ScoreBox label="Grammar" value={practiceResult.score?.grammar} />
                  <ScoreBox label="Vocabulary" value={practiceResult.score?.vocabulary} />
                  <ScoreBox label="Style" value={practiceResult.score?.style} />
                  <ScoreBox label="Overall" value={practiceResult.score?.overall} />
                </div>

                <div className="feedback-grid">
                  <FeedbackCard title="Grammar" text={practiceResult.feedback?.grammar} />
                  <FeedbackCard title="Vocabulary" text={practiceResult.feedback?.vocabulary} />
                  <FeedbackCard title="Style" text={practiceResult.feedback?.style} />
                  <FeedbackCard title="Overall" text={practiceResult.feedback?.overallComment} />
                </div>

                <div className="result-block">
                  <h3>Поради для покращення</h3>
                  <ul className="tips-list">
                    {(practiceResult.suggestions || []).map((tip, index) => (
                      <li key={`${tip}-${index}`}>{tip}</li>
                    ))}
                  </ul>
                </div>

                <ResultBlock title="Improved version" text={practiceResult.improvedVersion} />
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function ScoreBox({ label, value }) {
  return (
    <div className="score-box">
      <span>{label}</span>
      <strong>{value ?? "—"}/10</strong>
    </div>
  );
}

function ResultBlock({ title, text }) {
  return (
    <div className="result-block">
      <h3>{title}</h3>
      <p>{text || "—"}</p>
    </div>
  );
}

function FeedbackCard({ title, text }) {
  return (
    <div className="feedback-card">
      <h3>{title}</h3>
      <p>{text || "—"}</p>
    </div>
  );
}
