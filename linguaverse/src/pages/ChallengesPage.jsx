import { useMemo } from "react";
import { useProgress } from "../context/ProgressContext.jsx";
import { useTranslation } from "../i18n.jsx";
import "./ChallengesPage.css";

const accentClassMap = {
  green: "challenge-page-card--green",
  blue: "challenge-page-card--blue",
  violet: "challenge-page-card--violet",
  orange: "challenge-page-card--orange",
  pink: "challenge-page-card--pink",
};

export default function ChallengesPage() {
  const { challengesData, loading, error, refreshAll } = useProgress();
  const { translatePhrase } = useTranslation();

  const completedChallenges = useMemo(() => {
    return challengesData?.challenges?.filter((item) => item.completed) || [];
  }, [challengesData]);

  if (loading && !challengesData) {
    return <div className="challenges-page-loading">Завантаження челенджів...</div>;
  }

  if (error && !challengesData) {
    return <div className="challenges-page-error">{error}</div>;
  }

  const data = challengesData || {
    summary: {
      completedCount: 0,
      totalCount: 0,
      currentStreak: 0,
      todayXp: 0,
      todayMinutes: 0,
      completedLessons: 0,
    },
    challenges: [],
  };

  return (
    <div className="challenges-page">
      <section className="challenges-page-header">
        <div>
          <h1>Челенджі</h1>
          <p>Челенджі автоматично рахуються з того самого прогресу, що і головна сторінка та сторінка прогресу.</p>
        </div>
        <div className="challenges-page-summary-pill">
          {data.summary.completedCount}/{data.summary.totalCount} виконано
        </div>
      </section>

      <section className="challenges-page-overview">
        <div className="overview-box"><span>Серія днів</span><strong>{data.summary.currentStreak}</strong></div>
        <div className="overview-box"><span>XP сьогодні</span><strong>{data.summary.todayXp}</strong></div>
        <div className="overview-box"><span>Хвилини сьогодні</span><strong>{data.summary.todayMinutes}</strong></div>
        <div className="overview-box"><span>Завершено уроків</span><strong>{data.summary.completedLessons}</strong></div>
      </section>

      <section className="challenges-page-list">
        {data.challenges.map((challenge) => (
          <article key={challenge.key} className={`challenge-page-card ${accentClassMap[challenge.accent] || ""}`}>
            <div className="challenge-page-card-top">
              <div>
                <h3>{translatePhrase(challenge.title)}</h3>
                <p>{translatePhrase(challenge.description)}</p>
              </div>
              <div className="challenge-page-percent">{challenge.progress}%</div>
            </div>

            <div className="challenge-page-bar">
              <div className="challenge-page-bar-fill" style={{ width: `${challenge.progress}%` }} />
            </div>

            <div className="challenge-page-meta">
              <span>{translatePhrase(challenge.progressLabel)}</span>
              <span>+{challenge.rewardXp} XP</span>
            </div>
          </article>
        ))}
      </section>

      <button className="refresh-btn" type="button" onClick={refreshAll}>Оновити</button>

      <section className="challenges-page-completed">
        <h2>Виконані челенджі</h2>
        {completedChallenges.length === 0 ? (
          <p>Сьогодні ще немає завершених челенджів. Продовжуйте навчання!</p>
        ) : (
          <div className="completed-grid">
            {completedChallenges.map((item) => (
              <div key={`${item.key}-done`} className="completed-item">
                <strong>{translatePhrase(item.title)}</strong>
                <span>Нагорода: +{item.rewardXp} XP</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
