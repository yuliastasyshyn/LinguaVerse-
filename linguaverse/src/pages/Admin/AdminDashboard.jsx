import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "./AdminLayout.jsx";
import { adminRequest } from "./adminApi.js";
import "./Admin.css";

function MiniBarChart({ title, data = [], labelKey = "label", valueKey = "total" }) {
  const max = useMemo(() => Math.max(1, ...data.map((i) => Number(i[valueKey]) || 0)), [data, valueKey]);

  return (
    <div className="admin-chart-card">
      <h3>{title}</h3>
      {data.length === 0 ? (
        <p className="admin-muted">Поки немає даних</p>
      ) : (
        <div className="admin-bars">
          {data.map((item, index) => {
            const value = Number(item[valueKey]) || 0;
            return (
              <div className="admin-bar-row" key={`${item[labelKey]}-${index}`}>
                <span>{item[labelKey]}</span>
                <div><i style={{ width: `${Math.max(6, (value / max) * 100)}%` }} /></div>
                <b>{value}</b>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminRequest("/dashboard")
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <AdminLayout title="Адмін-панель"><div className="admin-alert">{error}</div></AdminLayout>;
  }

  if (!data) {
    return <AdminLayout title="Адмін-панель"><div className="admin-alert">Завантаження...</div></AdminLayout>;
  }

  const cards = [
    ["👥", "Користувачі", data.stats.users],
    ["🟢", "Активні сьогодні", data.stats.activeToday],
    ["📚", "Уроки", data.stats.lessons],
    ["💬", "AI чати", data.stats.aiChats],
    ["🏆", "Челенджі", data.stats.challenges],
    ["🏠", "Кімнати", data.stats.rooms],
    ["⭐", "Відгуки", data.stats.reviews],
    ["🚩", "Скарги", data.stats.reports],
  ];

  return (
    <AdminLayout
      title="Система аналітичного моніторингу"
      subtitle="Dashboard для контролю користувачів, контенту, активності та AI-функцій."
      action={<Link className="admin-primary-btn" to="/admin/users">Керувати користувачами</Link>}
    >
      <div className="admin-stats-grid wide">
        {cards.map(([icon, label, value]) => (
          <div className="admin-stat-card" key={label}>
            <span className="admin-stat-icon">{icon}</span>
            <p>{label}</p>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="admin-charts-grid">
        <MiniBarChart title="Нові користувачі по днях" data={data.charts.newUsersByDay} />
        <MiniBarChart title="Активність користувачів" data={data.charts.activityByDay} />
        <MiniBarChart title="AI chat usage statistics" data={data.charts.aiUsageByDay} />
        <MiniBarChart title="Популярність уроків" data={data.charts.popularLessons} labelKey="title" />
        <MiniBarChart title="Найчастіше використовувані слова" data={data.charts.popularWords} labelKey="word" />
      </div>

      <section className="admin-panel">
        <div className="admin-panel-title">
          <h2>Останні користувачі</h2>
          <Link to="/admin/users">Всі користувачі</Link>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              {data.recentUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td><span className="admin-badge">{user.role}</span></td>
                  <td><span className={`admin-status ${user.status}`}>{user.status}</span></td>
                  <td>{new Date(user.created_at).toLocaleDateString("uk-UA")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}
