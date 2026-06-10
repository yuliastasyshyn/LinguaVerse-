import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./LessonDetail.css";

const API_URL = "http://localhost:4000";

const parseVocabularyPair = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return { en: "", uk: "" };

  const separators = [" - ", " – ", " — ", "-", "–", "—", ":"];
  for (const separator of separators) {
    if (raw.includes(separator)) {
      const [first, ...rest] = raw.split(separator);
      return {
        en: first.trim(),
        uk: rest.join(separator).trim() || first.trim(),
      };
    }
  }

  return { en: raw, uk: raw };
};

const shuffleArray = (array) => {
  return [...array].sort(() => Math.random() - 0.5);
};

const buildAutoQuiz = (vocabularyTips = [], currentIndex = 0) => {
  const pairs = vocabularyTips.map(parseVocabularyPair).filter((item) => item.en && item.uk);

  if (!pairs.length) {
    return null;
  }

  const correctPair = pairs[currentIndex] || pairs[0];
  const wrongAnswers = pairs
    .filter((item) => item.uk !== correctPair.uk)
    .map((item) => item.uk)
    .slice(0, 3);

  const fallbackAnswers = ["слово", "речення", "навчання", "практика"].filter(
    (item) => item !== correctPair.uk && !wrongAnswers.includes(item)
  );

  const options = shuffleArray([correctPair.uk, ...wrongAnswers, ...fallbackAnswers].slice(0, 4));

  return {
    question: `Як перекладається слово “${correctPair.en}”?`,
    options,
    correctIndex: options.indexOf(correctPair.uk),
    generated: true,
  };
};

export default function LessonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentVocabIndex, setCurrentVocabIndex] = useState(0);
  const [showFlashcard, setShowFlashcard] = useState(false);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [checkedItems, setCheckedItems] = useState([]);
  const [flashcardsSeen, setFlashcardsSeen] = useState([]);
  const [notes, setNotes] = useState("");
  const [quizSelectedIndex, setQuizSelectedIndex] = useState(null);
  const [quizResult, setQuizResult] = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchLesson();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const vocabularyPairs = useMemo(() => {
    return lesson?.vocabularyTips?.map(parseVocabularyPair).filter((item) => item.en && item.uk) || [];
  }, [lesson]);

  const activeCard = vocabularyPairs[currentVocabIndex] || { en: "", uk: "" };

  const activeQuiz = useMemo(() => {
    if (lesson?.quiz?.question && Array.isArray(lesson.quiz.options) && lesson.quiz.options.length) {
      return lesson.quiz;
    }

    return buildAutoQuiz(lesson?.vocabularyTips || [], currentVocabIndex);
  }, [lesson, currentVocabIndex]);

  const fetchLesson = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/lessons/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch lesson");

      const data = await response.json();
      setLesson(data);
      setCheckedItems(
        Array.isArray(data.checkedItems)
          ? data.checkedItems
          : new Array(data.vocabularyTips?.length || 0).fill(false)
      );
      setFlashcardsSeen(Array.isArray(data.flashcardsSeen) ? data.flashcardsSeen : []);
      setNotes(data.notes || "");
      setQuizResult(data.quizResult || null);
      setQuizSelectedIndex(data.quizResult?.selectedIndex ?? null);
    } catch (error) {
      console.error("Error fetching lesson:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendDailyProgress = async (progressUpdate = {}) => {
    try {
      await fetch(`${API_URL}/api/progress/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(progressUpdate),
      });
    } catch (error) {
      console.error("Error syncing daily progress:", error);
    }
  };

  const handleCompleteLesson = async () => {
    try {
      const response = await fetch(`${API_URL}/api/lessons/${id}/complete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const updatedLesson = await response.json();
        setLesson(updatedLesson);
        await sendDailyProgress({ xp: updatedLesson.xp, lessonsCompleted: 1 });
        window.location.reload();
      }
    } catch (error) {
      console.error("Error completing lesson:", error);
    }
  };

  const handleUpdateProgress = async (payload = {}) => {
    try {
      const wasCompleted = lesson?.status === "completed";

      const response = await fetch(`${API_URL}/api/lessons/${id}/progress`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          checkedItems,
          flashcardsSeen,
          quizResult,
          ...payload,
        }),
      });

      if (response.ok) {
        const updatedLesson = await response.json();
        setLesson(updatedLesson);

        if (!wasCompleted && updatedLesson.status === "completed") {
          await sendDailyProgress({ xp: updatedLesson.xp, lessonsCompleted: 1 });
          setTimeout(() => window.location.reload(), 1000);
        }
      }
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };

  const handleCheckVocab = async (index) => {
    const newChecked = [...checkedItems];
    const newlyChecked = !newChecked[index];
    newChecked[index] = newlyChecked;

    setCheckedItems(newChecked);
    await handleUpdateProgress({ checkedItems: newChecked });

    if (newlyChecked) {
      await sendDailyProgress({ words: 1 });
    }
  };

  const markFlashcardSeen = async (index) => {
    const nextSeen = Array.from(new Set([...flashcardsSeen, index]));
    setFlashcardsSeen(nextSeen);
    await handleUpdateProgress({ flashcardsSeen: nextSeen });
  };

  const handleSaveNotes = async () => {
    try {
      const response = await fetch(`${API_URL}/api/lessons/${id}/notes`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes }),
      });

      if (response.ok) {
        const updatedLesson = await response.json();
        setLesson(updatedLesson);
      }
    } catch (error) {
      console.error("Error saving notes:", error);
    }
  };

  const handleQuizSelect = async (index) => {
    if (!activeQuiz) return;

    const result = {
      selectedIndex: index,
      correct: Number(index) === Number(activeQuiz.correctIndex),
      updatedAt: new Date().toISOString(),
    };

    setQuizSelectedIndex(index);
    setQuizResult(result);

    try {
      const isFirstAttempt = quizResult == null;

      const response = await fetch(`${API_URL}/api/lessons/${id}/quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ selectedIndex: index, quiz: activeQuiz }),
      });

      if (response.ok) {
        const updatedLesson = await response.json();
        setLesson(updatedLesson);
        setQuizResult(updatedLesson.quizResult || result);
        setQuizSelectedIndex(updatedLesson.quizResult?.selectedIndex ?? index);

        if (isFirstAttempt) {
          await sendDailyProgress({ quizzesCompleted: 1 });
        }
      } else {
        await handleUpdateProgress({ quizResult: result });
      }
    } catch (error) {
      console.error("Error saving quiz result:", error);
      await handleUpdateProgress({ quizResult: result });
    }
  };

  const goToCard = async (direction) => {
    if (!vocabularyPairs.length) return;

    const nextIndex = Math.min(
      vocabularyPairs.length - 1,
      Math.max(0, currentVocabIndex + direction)
    );

    setCurrentVocabIndex(nextIndex);
    setIsCardFlipped(false);
    setQuizSelectedIndex(null);
    setQuizResult(null);
    await markFlashcardSeen(nextIndex);
  };

  const speakVocab = (vocab) => {
    if ("speechSynthesis" in window) {
      const { en } = parseVocabularyPair(vocab);
      const utterance = new SpeechSynthesisUtterance(en);
      utterance.lang = "en-US";
      speechSynthesis.speak(utterance);
    }
  };

  if (loading) {
    return (
      <div className="lesson-detail-page">
        <p>Завантаження урока...</p>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="lesson-detail-page">
        <p>Урок не знайдено</p>
        <button onClick={() => navigate("/lessons")}>Назад до уроків</button>
      </div>
    );
  }

  return (
    <div className="lesson-detail-page">
      <div className="lesson-detail-header">
        <button className="back-btn" onClick={() => navigate("/lessons")}>← Назад</button>

        <div className="lesson-header-content">
          <h1>{lesson.title}</h1>
          <p>{lesson.description}</p>
        </div>

        <div className="lesson-meta-info">
          <span className="level-badge">{lesson.level}</span>
          <span className="xp-badge">+{lesson.xp} XP</span>
        </div>
      </div>

      <div className="lesson-detail-progress">
        <div className="progress-header">
          <span>Прогрес урока</span>
          <span className="progress-percent">{lesson.progress}%</span>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${lesson.progress}%` }}></div>
        </div>
      </div>

      <div className="lesson-detail-content">
        <section className="content-section lesson-panel">
          <h2>📚 Вміст урока</h2>
          <div className="content-box">
            <p>{lesson.content || "Коротка інформація про цей урок..."}</p>
          </div>
        </section>

        <section className="vocabulary-section lesson-panel">
          <h2>💡 Слова та вирази</h2>
          <div className="vocab-list">
            {lesson.vocabularyTips?.map((vocab, index) => {
              const pair = parseVocabularyPair(vocab);

              return (
                <div key={index} className={`vocab-item ${checkedItems[index] ? "checked" : ""}`}>
                  <div className="vocab-checkbox">
                    <input
                      type="checkbox"
                      checked={checkedItems[index] || false}
                      onChange={() => handleCheckVocab(index)}
                      id={`vocab-${index}`}
                    />
                    <label htmlFor={`vocab-${index}`}></label>
                  </div>

                  <div className="vocab-content">
                    <p className="vocab-text">
                      <strong>{pair.en}</strong>
                      <span>{pair.uk}</span>
                    </p>
                  </div>

                  <button className="speak-btn" onClick={() => speakVocab(vocab)} title="Прослухати вимову">
                    🔊
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="flashcard-section lesson-panel">
          <h2>🎯 Інтерактивні картки</h2>

          {vocabularyPairs.length ? (
            <div className="flashcard-container">
              <button
                className="flashcard-toggle"
                onClick={async () => {
                  if (!showFlashcard) {
                    await markFlashcardSeen(currentVocabIndex);
                  }
                  setShowFlashcard(!showFlashcard);
                  setIsCardFlipped(false);
                }}
              >
                {showFlashcard ? "Приховати карту" : "Показати карту"}
              </button>

              {showFlashcard && (
                <>
                  <button
                    className={`flip-card ${isCardFlipped ? "flipped" : ""}`}
                    type="button"
                    onClick={() => setIsCardFlipped((prev) => !prev)}
                    aria-label="Перевернути картку"
                  >
                    <span className="flip-card-inner">
                      <span className="flip-card-face flip-card-front">
                        <span className="card-label">English</span>
                        <strong>{activeCard.en}</strong>
                        <small>Натисніть, щоб побачити переклад</small>
                      </span>

                      <span className="flip-card-face flip-card-back">
                        <span className="card-label">Українською</span>
                        <strong>{activeCard.uk}</strong>
                        <small>Натисніть, щоб повернути англійське слово</small>
                      </span>
                    </span>
                  </button>

                  <div className="flashcard-nav">
                    <button onClick={() => goToCard(-1)} disabled={currentVocabIndex === 0}>
                      ← Попередня
                    </button>
                    <span className="card-counter">
                      {currentVocabIndex + 1} / {vocabularyPairs.length}
                    </span>
                    <button onClick={() => goToCard(1)} disabled={currentVocabIndex === vocabularyPairs.length - 1}>
                      Наступна →
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="empty-state">Для цього уроку ще не додано слова.</p>
          )}
        </section>

        <section className="quiz-section lesson-panel">
          <h2>❓ Перевір себе</h2>

          <div className="quiz-content">
            {activeQuiz ? (
              <>
                <p>{activeQuiz.question}</p>

                <div className="quiz-options">
                  {activeQuiz.options.map((option, index) => {
                    const isSelected = quizSelectedIndex === index;
                    const isCorrectAnswer = Number(activeQuiz.correctIndex) === index;
                    const showResult = quizResult !== null;
                    const isCorrect = showResult && isCorrectAnswer;
                    const isWrong = showResult && isSelected && !isCorrectAnswer;

                    return (
                      <button
                        key={`${option}-${index}`}
                        type="button"
                        className={`quiz-option ${isSelected ? "selected" : ""} ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`}
                        onClick={() => handleQuizSelect(index)}
                      >
                        <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                        <span className="option-text">{option}</span>
                      </button>
                    );
                  })}
                </div>

                {quizResult && (
                  <div className={`quiz-feedback ${quizResult.correct ? "correct" : "wrong"}`}>
                    {quizResult.correct
                      ? "Правильно! Молодець."
                      : `Неправильно. Правильна відповідь: ${activeQuiz.options[activeQuiz.correctIndex]}.`}
                  </div>
                )}
              </>
            ) : (
              <p className="quiz-empty">Немає доступного тесту для цього уроку.</p>
            )}
          </div>
        </section>

        <section className="notes-section lesson-panel">
          <h2>📝 Мої нотатки</h2>
          <textarea
            className="notes-textarea"
            placeholder="Напиши свої нотатки про цей урок..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleSaveNotes}
          />
        </section>
      </div>

      <div className="lesson-detail-footer">
        <div className="footer-info">
          <span className="lesson-duration">⏱️ {lesson.duration}</span>
          <span className="lesson-category">📂 {lesson.category}</span>
          <span className="lesson-status">
            {lesson.status === "completed" ? "✅ Завершено" : "📖 В процесі"}
          </span>
        </div>

        {lesson.status !== "completed" ? (
          <button className="complete-btn" onClick={handleCompleteLesson} disabled={lesson.progress < 100}>
            ✨ Завершити урок
          </button>
        ) : (
          <button className="repeat-btn" onClick={() => navigate("/lessons")}>
            🔄 Повторити урок
          </button>
        )}
      </div>
    </div>
  );
}
