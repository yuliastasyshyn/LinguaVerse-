import React from "react";
import "./DailyGoalCard.css";

export default function DailyGoalCard({ progress }) {
  const todayMinutes = progress?.today?.minutes ?? 0;
  const goalMinutes = progress?.dailyGoal?.minutes ?? 10;

  const percent = Math.min((todayMinutes / goalMinutes) * 100, 100);

  return (
    <div className="daily-goal-card">
      <h3>Денна ціль</h3>

      <p>
        {todayMinutes} / {goalMinutes} хв
      </p>

      <div className="goal-bar">
        <div
          className="goal-fill"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}