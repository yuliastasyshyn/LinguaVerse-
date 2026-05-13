export default function AchievementsCard({ achievements = [] }) {
  return (
    <div className="card">
      <h3>Останні досягнення</h3>

      {achievements.length === 0 && <p>Поки що немає нових досягнень.</p>}

      {achievements.map((achievement) => (
        <div key={achievement.id} className="achievement-item">
          <span className="achievement-icon">{achievement.icon}</span>
          <div>
            <strong>{achievement.title}</strong>
            <p>{achievement.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
