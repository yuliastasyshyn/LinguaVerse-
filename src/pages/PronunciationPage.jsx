import React, { useEffect, useMemo, useRef, useState } from "react";
import "./PronunciationPage.css";

const normalizeText = (text = "") =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s']/g, " ")
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

const getLocalSimilarity = (target, spoken) => {
  const cleanTarget = normalizeText(target);
  const cleanSpoken = normalizeText(spoken);

  if (!cleanTarget || !cleanSpoken) return 0;
  if (cleanTarget === cleanSpoken) return 100;

  const distance = levenshteinDistance(cleanTarget, cleanSpoken);
  const maxLength = Math.max(cleanTarget.length, cleanSpoken.length);
  const score = Math.round((1 - distance / maxLength) * 100);

  return Math.max(0, score);
};

const getLocalStatus = (score) => {
  if (score >= 90) return "excellent";
  if (score >= 75) return "good";
  if (score >= 55) return "average";
  return "try_again";
};

const getLocalFeedback = ({ targetText, spokenText, score }) => {
  if (!spokenText) {
    return {
      feedback: "Система не почула ваш голос. Спробуйте ще раз чіткіше і повільніше.",
      tips: [
        "Говоріть ближче до мікрофона",
        "Вимовляйте слово повільніше",
        "Переконайтесь, що браузер має доступ до мікрофона",
      ],
    };
  }

  if (score >= 90) {
    return {
      feedback: `Чудово! Вимова слова "${targetText}" дуже близька до еталону.`,
      tips: [
        "Спробуйте ще раз у швидшому темпі",
        "Переходьте до наступного слова",
      ],
    };
  }

  if (score >= 75) {
    return {
      feedback: `Непогано. Ви сказали "${spokenText}", але є невелика різниця з еталоном "${targetText}".`,
      tips: [
        "Спробуйте повторити слово ще раз",
        "Прослухайте еталонну вимову перед повтором",
        "Зверніть увагу на початок і кінець слова",
      ],
    };
  }

  return {
    feedback: `Є помітна різниця між "${spokenText}" і "${targetText}". Варто повторити ще раз.`,
    tips: [
      "Вимовляйте слово повільно по складах",
      "Кілька разів прослухайте еталонну вимову",
      "Сконцентруйтесь на кожному звуці окремо",
    ],
  };
};

export default function PronunciationPage() {
  const token = localStorage.getItem("token");
  const recognitionRef = useRef(null);

  const [lessons, setLessons] = useState([]);
  const [customWords, setCustomWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [source, setSource] = useState("all");
  const [currentIndex, setCurrentIndex] = useState(0);

  const [spokenText, setSpokenText] = useState("");
  const [result, setResult] = useState(null);

  const [isListening, setIsListening] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const [awardedWords, setAwardedWords] = useState([]);

  const [manualWord, setManualWord] = useState("");
  const [manualTranslation, setManualTranslation] = useState("");
  const [manualExercise, setManualExercise] = useState(null);

  const speechRecognitionSupported =
    typeof window !== "undefined" &&
    (!!window.SpeechRecognition || !!window.webkitSpeechRecognition);

  useEffect(() => {
    fetchPronunciationData();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const fetchPronunciationData = async () => {
    try {
      setLoading(true);
      setPageError("");

      const [lessonsRes, dictionaryRes] = await Promise.all([
        fetch("http://localhost:4000/api/lessons", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("http://localhost:4000/api/dictionary", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!lessonsRes.ok) throw new Error("Не вдалося завантажити уроки");
      if (!dictionaryRes.ok) throw new Error("Не вдалося завантажити словник");

      const lessonsData = await lessonsRes.json();
      const dictionaryData = await dictionaryRes.json();

      setLessons(Array.isArray(lessonsData) ? lessonsData : []);
      setCustomWords(
        Array.isArray(dictionaryData?.customWords) ? dictionaryData.customWords : []
      );
    } catch (error) {
      console.error(error);
      setPageError("Не вдалося завантажити сторінку вимови.");
    } finally {
      setLoading(false);
    }
  };

  const lessonExercises = useMemo(() => {
    return lessons.flatMap((lesson) =>
      (lesson.vocabularyTips || []).map((item, index) => {
        const [leftPart, rightPart = ""] = item.split(" - ");
        const variants = leftPart
          .split("/")
          .map((part) => part.trim())
          .filter(Boolean);

        return {
          id: `lesson-${lesson.id}-${index}`,
          text: variants[0] || leftPart.trim(),
          displayText: leftPart.trim(),
          translation: rightPart.trim(),
          source: "lessons",
          sourceLabel: `Урок: ${lesson.title}`,
        };
      })
    );
  }, [lessons]);

  const dictionaryExercises = useMemo(() => {
    return customWords.map((item) => ({
      id: `dictionary-${item.id}`,
      text: item.word,
      displayText: item.word,
      translation: item.translation,
      source: "dictionary",
      sourceLabel: "Мій словник",
    }));
  }, [customWords]);

  const customInputExercises = useMemo(() => {
    return manualExercise ? [manualExercise] : [];
  }, [manualExercise]);

  const exercises = useMemo(() => {
    if (source === "lessons") return lessonExercises;
    if (source === "dictionary") return dictionaryExercises;
    if (source === "custom") return customInputExercises;

    return [...lessonExercises, ...dictionaryExercises, ...customInputExercises];
  }, [source, lessonExercises, dictionaryExercises, customInputExercises]);

  useEffect(() => {
    if (currentIndex >= exercises.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, exercises.length]);

  const currentExercise = exercises[currentIndex];

  const handleUseManualWord = () => {
    const trimmedWord = manualWord.trim();
    const trimmedTranslation = manualTranslation.trim();

    if (!trimmedWord) {
      setPageError("Введіть слово або фразу для тренування.");
      return;
    }

    if (trimmedWord.length > 80) {
      setPageError("Будь ласка, введіть коротке слово або фразу до 80 символів.");
      return;
    }

    const newExercise = {
      id: `manual-${Date.now()}`,
      text: trimmedWord,
      displayText: trimmedWord,
      translation: trimmedTranslation,
      source: "custom",
      sourceLabel: "Власне слово",
    };

    setManualExercise(newExercise);
    setSource("custom");
    setCurrentIndex(0);
    setSpokenText("");
    setResult(null);
    setPageError("");
  };

  const handleSpeak = () => {
    if (!currentExercise?.text) return;

    const utterance = new SpeechSynthesisUtterance(currentExercise.text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleStartRecording = () => {
    setPageError("");
    setResult(null);
    setSpokenText("");

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setPageError(
        "Ваш браузер не підтримує розпізнавання мовлення. Найкраще працює Google Chrome."
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setSpokenText(transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setPageError("Не вдалося розпізнати голос. Спробуйте ще раз.");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const rewardProgressIfNeeded = async (exerciseId, score) => {
    if (score < 85) return;
    if (awardedWords.includes(exerciseId)) return;

    try {
      await fetch("http://localhost:4000/api/progress/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          xp: 5,
          words: 1,
          minutes: 1,
        }),
      });

      setAwardedWords((prev) => [...prev, exerciseId]);
    } catch (error) {
      console.error("Progress reward error:", error);
    }
  };

  const handleCheckPronunciation = async () => {
    if (!currentExercise) return;

    if (!spokenText.trim()) {
      setPageError("Спочатку запишіть слово або фразу.");
      return;
    }

    try {
      setIsChecking(true);
      setPageError("");

      const response = await fetch(
        "http://localhost:4000/api/pronunciation/evaluate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            targetText: currentExercise.text,
            spokenText,
            translation: currentExercise.translation,
            language: "en-US",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Pronunciation endpoint error");
      }

      const data = await response.json();
      setResult(data);
      await rewardProgressIfNeeded(currentExercise.id, data.score || 0);
    } catch (error) {
      console.error("Pronunciation backend error:", error);

      const score = getLocalSimilarity(currentExercise.text, spokenText);
      const status = getLocalStatus(score);
      const localFeedback = getLocalFeedback({
        targetText: currentExercise.text,
        spokenText,
        score,
      });

      const localResult = {
        targetText: currentExercise.text,
        spokenText,
        score,
        status,
        feedback: localFeedback.feedback,
        tips: localFeedback.tips,
      };

      setResult(localResult);
      await rewardProgressIfNeeded(currentExercise.id, score);
    } finally {
      setIsChecking(false);
    }
  };

  const handleAddDifficultWord = async () => {
    if (!currentExercise?.text) return;

    try {
      const response = await fetch("http://localhost:4000/api/dictionary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          word: currentExercise.text,
          translation: currentExercise.translation || "Без перекладу",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add word");
      }

      await fetchPronunciationData();
      alert("Слово додано у ваш словник.");
    } catch (error) {
      console.error(error);
      setPageError("Не вдалося додати слово у словник.");
    }
  };

  const handleNext = () => {
    if (!exercises.length) return;

    setCurrentIndex((prev) => (prev + 1) % exercises.length);
    setSpokenText("");
    setResult(null);
    setPageError("");
  };

  const handlePrev = () => {
    if (!exercises.length) return;

    setCurrentIndex((prev) => (prev - 1 + exercises.length) % exercises.length);
    setSpokenText("");
    setResult(null);
    setPageError("");
  };

  const resultLabelMap = {
    excellent: "Відмінно",
    good: "Добре",
    average: "Непогано",
    try_again: "Спробуйте ще раз",
  };

  if (loading) {
    return (
      <div className="pronunciation-page">
        <p>Завантаження сторінки вимови...</p>
      </div>
    );
  }

  if (pageError && !exercises.length) {
    return (
      <div className="pronunciation-page">
        <p className="pronunciation-error">{pageError}</p>
      </div>
    );
  }

  return (
    <div className="pronunciation-page">
      <section className="pronunciation-hero">
        <div>
          <h1>Тренажер вимови</h1>
          <p>
            Слухайте слово, повторюйте його вголос і отримуйте миттєвий фідбек від AI.
          </p>
        </div>

        <div className="pronunciation-score-box">
          <span>Джерел слів</span>
          <strong>{exercises.length}</strong>
        </div>
      </section>

      <section className="manual-input-card">
        <h3>Власне слово або фраза</h3>
        <p>Введіть будь-яке слово чи коротку фразу, щоб потренувати вимову.</p>

        <div className="manual-input-grid">
          <input
            type="text"
            placeholder="Наприклад: beautiful"
            value={manualWord}
            onChange={(e) => setManualWord(e.target.value)}
            className="manual-input"
          />

          <input
            type="text"
            placeholder="Переклад (необов’язково)"
            value={manualTranslation}
            onChange={(e) => setManualTranslation(e.target.value)}
            className="manual-input"
          />
        </div>

        <button className="custom-word-btn" onClick={handleUseManualWord}>
          ✨ Використати своє слово
        </button>
      </section>

      <section className="pronunciation-filters">
        <button
          className={source === "all" ? "filter-btn active" : "filter-btn"}
          onClick={() => {
            setSource("all");
            setCurrentIndex(0);
            setResult(null);
            setSpokenText("");
            setPageError("");
          }}
        >
          Усе
        </button>

        <button
          className={source === "lessons" ? "filter-btn active" : "filter-btn"}
          onClick={() => {
            setSource("lessons");
            setCurrentIndex(0);
            setResult(null);
            setSpokenText("");
            setPageError("");
          }}
        >
          З уроків
        </button>

        <button
          className={source === "dictionary" ? "filter-btn active" : "filter-btn"}
          onClick={() => {
            setSource("dictionary");
            setCurrentIndex(0);
            setResult(null);
            setSpokenText("");
            setPageError("");
          }}
        >
          Мій словник
        </button>

        <button
          className={source === "custom" ? "filter-btn active" : "filter-btn"}
          onClick={() => {
            setSource("custom");
            setCurrentIndex(0);
            setResult(null);
            setSpokenText("");
            setPageError("");
          }}
        >
          Моє слово
        </button>
      </section>

      {!speechRecognitionSupported && (
        <div className="support-warning">
          Ваш браузер може не підтримувати голосове розпізнавання. Для найкращої роботи відкрийте сторінку в Google Chrome.
        </div>
      )}

      {pageError && <p className="pronunciation-error">{pageError}</p>}

      {currentExercise ? (
        <>
          <section className="pronunciation-card">
            <div className="exercise-top">
              <span className="exercise-badge">{currentExercise.sourceLabel}</span>
              <span className="exercise-count">
                {currentIndex + 1} / {exercises.length}
              </span>
            </div>

            <h2 className="exercise-word">{currentExercise.displayText}</h2>
            <p className="exercise-translation">
              {currentExercise.translation || "Без перекладу"}
            </p>

            <div className="pronunciation-actions">
              <button className="main-action" onClick={handleSpeak}>
                🔊 Прослухати
              </button>

              {!isListening ? (
                <button className="main-action secondary" onClick={handleStartRecording}>
                  🎤 Почати запис
                </button>
              ) : (
                <button className="main-action danger" onClick={handleStopRecording}>
                  ⏹ Зупинити
                </button>
              )}

              <button
                className="main-action success"
                onClick={handleCheckPronunciation}
                disabled={isChecking}
              >
                {isChecking ? "Перевірка..." : "✅ Перевірити"}
              </button>
            </div>
          </section>

          <section className="pronunciation-grid">
            <div className="pronunciation-panel">
              <h3>Що ви сказали</h3>
              <div className="spoken-box">
                {spokenText
                  ? spokenText
                  : "Після запису тут з’явиться розпізнаний текст"}
              </div>

              <div className="panel-actions">
                <button className="small-btn" onClick={handlePrev}>
                  ← Попереднє
                </button>
                <button className="small-btn" onClick={handleNext}>
                  Наступне →
                </button>
                <button className="small-btn" onClick={handleAddDifficultWord}>
                  ➕ Додати у словник
                </button>
              </div>
            </div>

            <div className="pronunciation-panel">
              <h3>Результат перевірки</h3>

              {result ? (
                <div className="result-box">
                  <div className="result-score">
                    <span>Оцінка</span>
                    <strong>{result.score ?? 0}%</strong>
                  </div>

                  <div className="result-status">
                    Статус: <b>{resultLabelMap[result.status] || "Оцінено"}</b>
                  </div>

                  <div className="result-row">
                    <span>Еталон:</span>
                    <strong>{result.targetText || currentExercise.text}</strong>
                  </div>

                  <div className="result-row">
                    <span>Розпізнано:</span>
                    <strong>{result.spokenText || spokenText}</strong>
                  </div>

                  <div className="ai-feedback">
                    <h4>AI-пояснення</h4>
                    <p>{result.feedback}</p>

                    {Array.isArray(result.tips) && result.tips.length > 0 && (
                      <ul>
                        {result.tips.map((tip, index) => (
                          <li key={index}>{tip}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : (
                <p className="empty-result">
                  Після перевірки тут з’явиться оцінка, пояснення та поради.
                </p>
              )}
            </div>
          </section>
        </>
      ) : (
        <section className="pronunciation-empty">
          <h2>Поки немає слів для тренування</h2>
          <p>
            Додайте слова у словник, відкрийте уроки або введіть власне слово,
            щоб з’явився матеріал для вимови.
          </p>
        </section>
      )}
    </div>
  );
}
