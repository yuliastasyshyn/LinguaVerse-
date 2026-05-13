export default function ProgressCard({ progress }) {
  const totalXp = progress?.xp ?? 0;
  const words = progress?.words ?? 0;
  const todayXp = progress?.today?.xp ?? 0;
  const activeDays = progress?.active_days ?? progress?.streak?.totalActiveDays ?? 0;
  const currentStreak = progress?.current_streak ?? progress?.streak?.current ?? 0;
  const lessonProgress = progress?.lessonSummary?.averageProgress ?? 0;

  const metrics = [
    { label: "Усього XP", value: totalXp },
    { label: "Слів вивчено", value: words },
    { label: "Сьогодні XP", value: todayXp },
    { label: "Активних днів", value: activeDays },
    { label: "Поточна серія", value: currentStreak },
    { label: "Прогрес уроків", value: `${lessonProgress}%` },
  ];

  return (
    <div className="card progress-card-inner">
      <h3>Ваш прогрес</h3>

      <div className="progress-metrics-grid">
        {metrics.map((metric) => (
          <div className="progress-metric" key={metric.label}>
            <span className="metric-label">{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
