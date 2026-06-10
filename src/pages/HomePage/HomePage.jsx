import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import ChallengeCard from "../ChallengeCard.jsx";
import AchievementsCard from "../AchievementsCard.jsx";
import RoomsRecommended from "../RoomsRecommended.jsx";
import { useProgress } from "../../context/ProgressContext.jsx";
import { useTranslation } from "../../i18n.jsx";

import "./HomePage.css";


const toSafeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const clampPercent = (value) => Math.max(0, Math.min(100, Math.round(value)));

const buildAchievements = (progress) => {
  const achievements = [];
  const totalXp = Number(progress?.xp ?? 0);
  const currentStreak = Number(progress?.current_streak ?? progress?.streak?.current ?? 0);
  const totalWords = Number(progress?.words ?? 0);
  const completedLessons = Number(progress?.lessonSummary?.completedLessons ?? 0);

  if (currentStreak >= 3) {
    achievements.push({
      id: "streak-3",
      icon: "✦",
      title: "На хвилі навчання",
      description: `Серія без перерв уже ${currentStreak} день.`,
    });
  }

  if (totalXp >= 50) {
    achievements.push({
      id: "xp-50",
      icon: "◆",
      title: "Перший серйозний ривок",
      description: `Ви вже набрали ${totalXp} XP. Так тримати!`,
    });
  }

  if (totalWords >= 20) {
    achievements.push({
      id: "words-20",
      icon: "◈",
      title: "Колекціонер слів",
      description: `Вивчено ${totalWords} нових слів.`,
    });
  }

  if (completedLessons >= 1) {
    achievements.push({
      id: "lessons-1",
      icon: "✓",
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
  const { t } = useTranslation();

  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({
    email: user?.email || "",
    name: user?.name || "",
    rating: 5,
    text: "",
  });
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/reviews");
        const data = await res.json();
        if (res.ok) setReviews(data);
      } catch (error) {
        console.error("Reviews load error:", error);
      }
    };

    fetchReviews();
  }, []);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewMessage("");

    if (!reviewForm.email.trim() || !reviewForm.text.trim()) {
      setReviewMessage("Введіть email зареєстрованого акаунта та текст відгуку.");
      return;
    }

    try {
      setReviewLoading(true);

      const res = await fetch("http://localhost:4000/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...reviewForm,
          email: reviewForm.email.trim().toLowerCase(),
          name: reviewForm.name.trim(),
          text: reviewForm.text.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setReviewMessage(data.message || "Не вдалося залишити відгук.");
        return;
      }

      setReviews((prevReviews) => [data, ...prevReviews]);
      setReviewForm({
        email: user?.email || "",
        name: user?.name || "",
        rating: 5,
        text: "",
      });
      setReviewMessage("Дякуємо! Ваш відгук успішно додано.");
    } catch (error) {
      console.error("Review create error:", error);
      setReviewMessage("Помилка зʼєднання із сервером.");
    } finally {
      setReviewLoading(false);
    }
  };

  const achievements = useMemo(() => (progress ? buildAchievements(progress) : []), [progress]);

  const todayMinutes = toSafeNumber(
    progress?.minutes_today ??
      progress?.todayMinutes ??
      progress?.daily_goal?.current ??
      progress?.dailyGoal?.current ??
      progress?.today_xp ??
      progress?.todayXp,
    0
  );

  const dailyGoal = toSafeNumber(
    progress?.daily_goal ??
      progress?.dailyGoal ??
      progress?.goal ??
      progress?.daily_goal_minutes ??
      user?.daily_goal ??
      user?.dailyGoal,
    30
  );

  const dailyGoalPercent = clampPercent(dailyGoal > 0 ? (todayMinutes / dailyGoal) * 100 : 0);

  const totalXp = toSafeNumber(progress?.xp, 0);
  const totalWords = toSafeNumber(progress?.words, 0);
  const activeDays = toSafeNumber(progress?.active_days ?? progress?.activeDays, 0);
  const completedLessons = toSafeNumber(progress?.lessonSummary?.completedLessons, 0);
  const totalLessons = toSafeNumber(progress?.lessonSummary?.totalLessons, completedLessons > 0 ? completedLessons : 1);
  const lessonProgressPercent = clampPercent(
    progress?.lessonSummary?.progressPercent ??
      progress?.lesson_progress ??
      (totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0)
  );

  const progressStats = [
    { label: "Усього XP", value: totalXp, max: 120, icon: "✦" },
    { label: "Слів вивчено", value: totalWords, max: 80, icon: "◈" },
    { label: "Активних днів", value: activeDays, max: 30, icon: "●" },
    { label: "Поточна серія", value: toSafeNumber(progress?.current_streak ?? progress?.streak?.current, 0), max: 14, icon: "◆" },
  ];

  const quickPracticeItems = [
    { label: t("home.quickPracticeItem1"), path: "/lessons" },
    { label: t("home.quickPracticeItem2"), path: "/dictionary" },
    { label: t("home.quickPracticeItem3"), path: "/pronunciation" },
    { label: t("home.quickPracticeItem4"), path: "/translator" },
    { label: t("home.quickPracticeItem5"), path: "/rooms" },
    { label: t("home.quickPracticeItem6"), path: "/progress" },
  ];

  if (loading && !progress) {
    return <p style={{ padding: "40px", fontSize: "22px" }}>{t("home.loading")}</p>;
  }

  if (error && !progress) {
    return <p style={{ padding: "40px", fontSize: "18px", color: "#7a1f34" }}>{error}</p>;
  }

  if (!progress) {
    return <p style={{ padding: "40px", fontSize: "22px" }}>{t("home.noProgress")}</p>;
  }

  const currentStreak = progress?.current_streak ?? progress?.streak?.current ?? 0;

  return (
    <div className="homepage">
      <div className="welcome-section">
        <div>
          <span className="eyebrow">{t("home.appName")}</span>
          <h2>
            {t("home.welcome")} {user?.name || t("home.userFallback")}
            <span className="welcome-icon">✦</span>
          </h2>
          <p>{t("home.subtitle")}</p>
        </div>
      </div>

      <div className="top-section">
        <div className="streak-card">
          <span className="card-kicker">{t("home.streakKicker")}</span>
          <h3>{t("home.streakTitle")}</h3>
          <div className="number">
  {currentStreak}{" "}
  {currentStreak === 1
    ? "день"
    : currentStreak >= 2 && currentStreak <= 4
    ? "дні"
    : "днів"}
</div>
          <span className="small-text">{t("home.streakSmallText")}</span>
        </div>

        <div
          className="daily-goal-card circular-goal-card"
          style={{ "--goal-percent": `${dailyGoalPercent}%` }}
        >
          <div className="daily-goal-info">
            <span className="card-kicker">{t("home.dailyGoal") || "Денна ціль"}</span>
            <h3>{t("Сьогоднішній прогрес") || "Сьогоднішній прогрес"}</h3>
            <p>
              {todayMinutes} / {dailyGoal} хв
            </p>
          </div>

          <div className="goal-circle" aria-label={`Денна ціль виконана на ${dailyGoalPercent}%`}>
            <div className="goal-circle-inner">
              <strong>{dailyGoalPercent}%</strong>
              <span>цілі</span>
            </div>
          </div>
        </div>
      </div>

      <section className="progress-section progress-diagram-section">
        <div className="progress-diagram-head">
          <div>
            <span className="eyebrow">LEARNING ANALYTICS</span>
            <h3>Ваш прогрес</h3>
            <p>Структурована діаграма показує загальний розвиток, активність і результат навчання.</p>
          </div>
        </div>

        <div className="progress-diagram-layout">
          <div
            className="lesson-donut"
            style={{ "--lesson-progress": `${lessonProgressPercent}%` }}
            aria-label={`Прогрес уроків ${lessonProgressPercent}%`}
          >
            <div className="lesson-donut-inner">
              <strong>{lessonProgressPercent}%</strong>
              <span>уроків</span>
            </div>
          </div>

          <div className="progress-bars-panel">
            {progressStats.map((item) => {
              const percent = clampPercent((item.value / item.max) * 100);

              return (
                <article className="progress-row-card" key={item.label}>
                  <div className="progress-row-top">
                    <span className="progress-row-icon">{item.icon}</span>
                    <div>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  </div>
                  <div className="progress-line">
                    <span style={{ width: `${percent}%` }} />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <div className="challenges-section wide">
        <h3>{t("home.challengesTitle")}</h3>
        <ChallengeCard challenges={challenges} />
        <button className="view-all-btn" type="button" onClick={() => navigate("/challenges")}>
          {t("home.challengesBtn")}
        </button>
      </div>

      <div className="rooms-section wide">
        <RoomsRecommended rooms={rooms} />
      </div>

      <div className="achievements-section wide">
        <h3>{t("home.achievementsTitle")}</h3>
        <AchievementsCard achievements={achievements} />
      </div>

      <div className="quick-practice">
        <h3>{t("home.quickPracticeTitle")}</h3>
        <ul>
          {quickPracticeItems.map((item) => (
            <li key={item.path} onClick={() => navigate(item.path)}>
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      <section className="home-reviews-section wide">
        <div className="home-reviews-head">
          <div>
            <span className="eyebrow">USER REVIEWS</span>
            <h3>Залишити відгук</h3>
            <p>Відгук буде опубліковано тільки якщо email справді зареєстрований у LinguaVerse.AI.</p>
          </div>
        </div>

        <form className="home-review-form" onSubmit={handleReviewSubmit}>
          <input
            type="email"
            placeholder="Email зареєстрованого акаунта"
            value={reviewForm.email}
            onChange={(e) => setReviewForm({ ...reviewForm, email: e.target.value })}
          />

          <input
            type="text"
            placeholder="Ім'я (необов'язково)"
            value={reviewForm.name}
            onChange={(e) => setReviewForm({ ...reviewForm, name: e.target.value })}
          />

          <select
            value={reviewForm.rating}
            onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
          >
            <option value={5}>★★★★★ 5</option>
            <option value={4}>★★★★ 4</option>
            <option value={3}>★★★ 3</option>
            <option value={2}>★★ 2</option>
            <option value={1}>★ 1</option>
          </select>

          <textarea
            placeholder="Напишіть свій відгук..."
            value={reviewForm.text}
            onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })}
          />

          <button type="submit" disabled={reviewLoading}>
            {reviewLoading ? "Перевіряємо..." : "Надіслати відгук"}
          </button>

          {reviewMessage && <p className="home-review-message">{reviewMessage}</p>}
        </form>

        <div className="home-reviews-list">
          {reviews.slice(0, 3).map((review) => (
            <article className="home-review-card" key={review.id}>
              <div className="home-review-rating">
                {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
              </div>
              <p>{review.text}</p>
              <strong>{review.name || review.email}</strong>
            </article>
          ))}
        </div>
      </section>

      <button className="view-all-btn refresh-btn" type="button" onClick={refreshAll}>
        {t("home.refreshProgress")}
      </button>
    </div>
  );
}