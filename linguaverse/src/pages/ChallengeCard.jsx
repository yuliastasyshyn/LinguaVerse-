import { useTranslation } from "../i18n.jsx";

export default function ChallengeCard({ challenges = [] }) {
  const { translatePhrase } = useTranslation();

  return (
    <div className="card">
      <h3>Активні челенджі</h3>

      {challenges.length === 0 && <p>Сьогодні активних челенджів немає.</p>}

      {challenges.map((challenge, index) => {
        const goal = Math.max(challenge.goal || 1, 1);
        const percentage = Math.min(Math.round((challenge.progress / goal) * 100), 100);

        return (
          <div key={challenge.id ?? challenge.key ?? challenge.title ?? index} className="challenge-item">
            <div className="challenge-item__header">
              <div>
                <strong>{translatePhrase(challenge.title)}</strong>
                <p className="challenge-subtitle">{translatePhrase(challenge.description)}</p>
              </div>
              <span className={`challenge-badge ${challenge.completed ? "completed" : ""}`}>
                {challenge.completed ? translatePhrase("Виконано") : `${percentage}%`}
              </span>
            </div>

            <div className="goal-bar">
              <div className="goal-fill" style={{ width: `${percentage}%` }} />
            </div>

            <p className="challenge-progress-text">
              {challenge.progress}/{goal} {translatePhrase(challenge.unit)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
