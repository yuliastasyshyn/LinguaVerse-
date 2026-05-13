import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import DailyGoalCard from "../DailyGoalCard.jsx";
import ProgressCard from "../ProgressCard.jsx";
import ChallengeCard from "../ChallengeCard.jsx";
import AchievementsCard from "../AchievementsCard.jsx";
import RoomsRecommended from "../RoomsRecommended.jsx";
import { useProgress } from "../../context/ProgressContext.jsx";

import "./HomePage.css";

const buildAchievements = (progress) => {
  const achievements = [];
  const totalXp = Number(progress?.xp ?? 0);
  const currentStreak = Number(progress?.current_streak ?? progress?.streak?.current ?? 0);
  const totalWords = Number(progress?.words ?? 0);
  const completedLessons = Number(progress?.lessonSummary?.completedLessons ?? 0);

  if (currentStreak >= 3) {
    achievements.push({
      id: "streak-3",
      icon: "🔥",
      title: "На хвилі навчання",
      description: `Серія без перерв уже ${currentStreak} дні(в).`,
    });
  }

  if (totalXp >= 50) {
    achievements.push({
      id: "xp-50",
      icon: "⚡",
      title: "Перший серйозний ривок",
      description: `Ви вже набрали ${totalXp} XP. Так тримати!`,
    });
  }

  if (totalWords >= 20) {
    achievements.push({
      id: "words-20",
      icon: "📚",
      title: "Колекціонер слів",
      description: `Вивчено ${totalWords} нових слів.`,
    });
  }

  if (completedLessons >= 1) {
    achievements.push({
      id: "lessons-1",
      icon: "🏁",
      title: "Початок покладено",
      description: `Завершено уроків: ${completedLessons}.`,
    });
  }

  return achievements.slice(0, 4);
};

export default function HomePage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const { progress, challenges, rooms, loading, error, refreshAll } = useProgress();

  const achievements = useMemo(() => (progress ? buildAchievements(progress) : []), [progress]);

  if (loading && !progress) {
    return <p style={{ padding: "40px", fontSize: "22px" }}>Завантаження...</p>;
  }

  if (error && !progress) {
    return <p style={{ padding: "40px", fontSize: "18px", color: "crimson" }}>{error}</p>;
  }

  if (!progress) {
    return <p style={{ padding: "40px", fontSize: "22px" }}>Немає даних прогресу.</p>;
  }

  const currentStreak = progress?.current_streak ?? progress?.streak?.current ?? 0;

  return (
    <div className="homepage">
      <div className="welcome-section">
        <h2>Вітаємо, {user?.name || "Користувачу"}! 👋</h2>
        <p>Продовжуйте вивчення мови — ваш прогрес вже виглядає чудово.</p>
      </div>

      <div className="top-section">
        <div className="streak-card">
          <h3>Поточна серія</h3>
          <div className="number">{currentStreak} днів</div>
          <span className="small-text">🔥 Серія рахується лише за послідовні дні без пропусків</span>
        </div>

        <DailyGoalCard progress={progress} />
      </div>

      <div className="progress-section">
        <ProgressCard progress={progress} />
      </div>

      <div className="challenges-section wide">
        <h3>Активні челенджі</h3>
        <ChallengeCard challenges={challenges} />
        <button className="view-all-btn" type="button" onClick={() => navigate("/challenges")}>
          Перейти до челенджів
        </button>
      </div>

      <div className="rooms-section wide">
        <RoomsRecommended rooms={rooms} />
      </div>

      <div className="achievements-section wide">
        <h3>Останні досягнення</h3>
        <AchievementsCard achievements={achievements} />
      </div>

      <div className="quick-practice">
        <h3>Швидка практика</h3>
        <ul>
          <li onClick={() => navigate("/lessons")}>Міні-тест на слова</li>
          <li onClick={() => navigate("/dictionary")}>Швидке повторення лексики</li>
          <li onClick={() => navigate("/pronunciation")}>Практика вимови</li>
        </ul>
      </div>

      <button className="view-all-btn" type="button" onClick={refreshAll}>
        Оновити прогрес
      </button>
    </div>
  );
}
