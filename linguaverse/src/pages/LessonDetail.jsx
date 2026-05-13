import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./LessonDetail.css";

export default function LessonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentVocabIndex, setCurrentVocabIndex] = useState(0);
  const [showFlashcard, setShowFlashcard] = useState(false);
  const [checkedItems, setCheckedItems] = useState([]);
  const [flashcardsSeen, setFlashcardsSeen] = useState([]);
  const [notes, setNotes] = useState("");
  const [quizSelectedIndex, setQuizSelectedIndex] = useState(null);
  const [quizResult, setQuizResult] = useState(null);

  useEffect(() => {
    fetchLesson();
  }, [id]);

  const fetchLesson = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:4000/api/lessons/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch");
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

  const token = localStorage.getItem("token");

  const sendDailyProgress = async (progressUpdate = {}) => {
    try {
      await fetch("http://localhost:4000/api/progress/update", {
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
      const response = await fetch(`http://localhost:4000/api/lessons/${id}/complete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const updatedLesson = await response.json();
        setLesson(updatedLesson);
        await sendDailyProgress({ xp: updatedLesson.xp, lessonsCompleted: 1 });
        // Оновлюємо сторінку після завершення
        window.location.reload();
      }
    } catch (error) {
      console.error("Error completing lesson:", error);
    }
  };

  const handleUpdateProgress = async (payload = {}) => {
    try {
      const wasCompleted = lesson?.status === "completed";
      const response = await fetch(`http://localhost:4000/api/lessons/${id}/progress`, {
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
          // Оновлюємо сторінку після завершення уроку
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
      const response = await fetch(`http://localhost:4000/api/lessons/${id}/notes`, {
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
    try {
      const isFirstAttempt = quizResult == null;
      setQuizSelectedIndex(index);
      const response = await fetch(`http://localhost:4000/api/lessons/${id}/quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ selectedIndex: index }),
      });
      if (response.ok) {
        const updatedLesson = await response.json();
        setLesson(updatedLesson);
        setQuizResult(updatedLesson.quizResult);
        setQuizSelectedIndex(updatedLesson.quizResult.selectedIndex);
        if (isFirstAttempt) {
          await sendDailyProgress({ quizzesCompleted: 1 });
        }
      }
    } catch (error) {
      console.error("Error saving quiz result:", error);
    }
  };

  const speakVocab = (vocab) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(vocab.split(" - ")[0]);
      utterance.lang = "en-US";
      speechSynthesis.speak(utterance);
    }
  };

  if (loading) {
    return <div className="lesson-detail-page"><p>Завантаження урока...</p></div>;
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
        <section className="content-section">
          <h2>📚 Вміст урока</h2>
          <div className="content-box">
            <p>{lesson.content || "Коротка інформація про цей урок..."}</p>
          </div>
        </section>

        <section className="vocabulary-section">
          <h2>💡 Слова та вирази</h2>
          <div className="vocab-list">
            {lesson.vocabularyTips?.map((vocab, index) => (
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
                  <p className="vocab-text">{vocab}</p>
                </div>
                <button className="speak-btn" onClick={() => speakVocab(vocab)} title="Прослухати вимову">🔊</button>
              </div>
            ))}
          </div>
        </section>

        <section className="flashcard-section">
          <h2>🎯 Інтерактивні картки</h2>
          {lesson.vocabularyTips?.length ? (
            <div className="flashcard-container">
              <button
                className="flashcard-toggle"
                onClick={async () => {
                  if (!showFlashcard) {
                    await markFlashcardSeen(currentVocabIndex);
                  }
                  setShowFlashcard(!showFlashcard);
                }}
              >
                {showFlashcard ? "Приховати" : "Показати"} карту
              </button>
              {showFlashcard && (
                <div className="flashcard">
                  <div className="flashcard-content">
                    <p className="flashcard-text">{lesson.vocabularyTips[currentVocabIndex]}</p>
                  </div>
                  <div className="flashcard-nav">
                    <button
                      onClick={async () => {
                        const nextIndex = Math.max(0, currentVocabIndex - 1);
                        setCurrentVocabIndex(nextIndex);
                        await markFlashcardSeen(nextIndex);
                      }}
                      disabled={currentVocabIndex === 0}
                    >
                      ← Попередня
                    </button>
                    <span className="card-counter">{currentVocabIndex + 1} / {lesson.vocabularyTips.length}</span>
                    <button
                      onClick={async () => {
                        const nextIndex = Math.min(lesson.vocabularyTips.length - 1, currentVocabIndex + 1);
                        setCurrentVocabIndex(nextIndex);
                        await markFlashcardSeen(nextIndex);
                      }}
                      disabled={currentVocabIndex === lesson.vocabularyTips.length - 1}
                    >
                      Наступна →
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </section>

        <section className="quiz-section">
          <h2>❓ Перевір себе</h2>
          <div className="quiz-content">
            <p>{lesson.quiz?.question || "Цей урок ще не має тесту."}</p>
            <div className="quiz-options">
              {lesson.quiz?.options?.length ? (
                lesson.quiz.options.map((option, index) => {
                  const isSelected = quizSelectedIndex === index;
                  const isCorrect = quizResult?.correct && quizResult.selectedIndex === index;
                  const isWrong = quizSelectedIndex === index && quizResult && !quizResult.correct;
                  return (
                    <button
                      key={index}
                      className={`quiz-option ${isSelected ? "selected" : ""} ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`}
                      onClick={() => handleQuizSelect(index)}
                    >
                      <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                      <span className="option-text">{option}</span>
                    </button>
                  );
                })
              ) : (
                <p className="quiz-empty">Немає доступного тесту для цього уроку.</p>
              )}
            </div>
            {quizResult && (
              <div className={`quiz-feedback ${quizResult.correct ? "correct" : "wrong"}`}>
                {quizResult.correct ? "Правильно! Молодець." : "Неправильно. Спробуй ще раз."}
              </div>
            )}
          </div>
        </section>

        <section className="notes-section">
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
          <button className="repeat-btn" onClick={() => navigate("/lessons")}>🔄 Повторити урок</button>
        )}
      </div>
    </div>
  );
}
