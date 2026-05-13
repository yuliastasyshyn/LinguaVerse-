import React from "react";
import { useProgress } from "../context/ProgressContext.jsx";
import "./ProgressPage.css";

const calculateScore = ({ xp = 0, words = 0, minutes = 0, lessonsCompleted = 0, quizzesCompleted = 0 }) => {
  const xpScore = Math.min(Number(xp) / 20, 1) * 15;
  const timeScore = Math.min(Number(minutes) / 30, 1) * 35;
  const lessonScore = Math.min(Number(lessonsCompleted), 2) * 20;
  const wordScore = Math.min(Number(words) / 10, 1) * 10;
  const quizScore = Math.min(Number(quizzesCompleted), 1) * 10;
  return Math.round(Math.min(xpScore + timeScore + lessonScore + wordScore + quizScore, 100));
};

const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function ProgressPage() {
  const { progress, loading, error, refreshAll } = useProgress();

  const renderHistory = () => {
    const history = progress?.history?.slice(0, 7) || [];

    if (!history.length) {
      return <p>Історія ще порожня. Розпочніть сьогоднішній день!</p>;
    }

    return (
      <div className="history-grid">
        {history.map((day) => {
          const score = calculateScore(day);
          return (
            <div key={day.date} className="history-card">
              <span className="history-date">{formatDate(day.date)}</span>
              <div className="history-score">{score}%</div>
              <div className="history-row">XP: {day.xp ?? 0}</div>
              <div className="history-row">Слов: {day.words ?? 0}</div>
              <div className="history-row">Хвилин: {day.minutes ?? 0}</div>
              <div className="history-row">Уроки: {day.lessonsCompleted ?? 0}</div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading && !progress) {
    return <div className="progress-page"><p>Завантаження прогресу...</p></div>;
  }

  if (error && !progress) {
    return <div className="progress-page"><p className="error-text">{error}</p></div>;
  }

  const today = progress?.today || {};
  const lessonSummary = progress?.lessonSummary || {};

  return (
    <div className="progress-page">
      <header className="progress-hero">
        <div>
          <h1>Кімната прогресу</h1>
          <p>Усі сторінки LinguaVerse використовують ці самі дані прогресу.</p>
        </div>
        <div className="progress-score-card">
          <span>Сьогоднішній бал</span>
          <strong>{today.score ?? 0}%</strong>
        </div>
      </header>

      <section className="progress-summary">
        <div className="summary-card">
          <h3>Загальний XP</h3>
          <p>{progress?.xp ?? 0}</p>
        </div>
        <div className="summary-card">
          <h3>Слова</h3>
          <p>{progress?.words ?? 0}</p>
        </div>
        <div className="summary-card">
          <h3>Активні дні</h3>
          <p>{progress?.active_days ?? 0}</p>
        </div>
        <div className="summary-card">
          <h3>Поточна серія</h3>
          <p>{progress?.current_streak ?? progress?.streak?.current ?? 0}</p>
        </div>
      </section>

      <section className="progress-goals">
        <div className="goal-card">
          <h2>Сьогодні</h2>
          <div className="goal-row"><span>XP</span><strong>{today.xp ?? 0}</strong></div>
          <div className="goal-row"><span>Слова</span><strong>{today.words ?? 0}</strong></div>
          <div className="goal-row"><span>Хвилини</span><strong>{today.minutes ?? 0}</strong></div>
          <div className="goal-row"><span>Уроки</span><strong>{today.lessonsCompleted ?? 0}</strong></div>
          <div className="goal-row"><span>Тести</span><strong>{today.quizzesCompleted ?? 0}</strong></div>
        </div>

        <div className="goal-card">
          <h2>Уроки</h2>
          <div className="goal-row"><span>Пройдено уроків</span><strong>{lessonSummary.completedLessons ?? 0}</strong></div>
          <div className="goal-row"><span>В процесі</span><strong>{lessonSummary.inProgressLessons ?? 0}</strong></div>
          <div className="goal-row"><span>Середній прогрес</span><strong>{lessonSummary.averageProgress ?? 0}%</strong></div>
        </div>
      </section>

      <section className="progress-history">
        <div className="history-header">
          <h2>Історія за останні 7 днів</h2>
          <button className="refresh-btn" onClick={refreshAll}>Оновити</button>
        </div>
        {renderHistory()}
      </section>

      <section className="progress-algorithm">
        <h2>Як обчислюється щоденний бал</h2>
        <ul>
          <li>До 35% за час занять.</li>
          <li>До 15% за XP, зароблені сьогодні.</li>
          <li>До 40% за прогрес уроків.</li>
          <li>До 10% за додані слова й тести.</li>
        </ul>
      </section>
    </div>
  );
}
