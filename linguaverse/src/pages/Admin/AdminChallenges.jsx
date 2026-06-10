import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout.jsx";
import { adminRequest } from "./adminApi.js";
import "./Admin.css";

const emptyChallenge = {
  title: "",
  description: "",
  xp_reward: 50,
  deadline: "",
  difficulty: "medium",
  badge: "🏆",
  status: "active",
};

export default function AdminChallenges() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyChallenge);
  const [editingId, setEditingId] = useState(null);

  async function load() {
    setItems(await adminRequest("/challenges"));
  }

  useEffect(() => {
    load();
  }, []);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function save(e) {
    e.preventDefault();

    if (editingId) {
      await adminRequest(`/challenges/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
    } else {
      await adminRequest("/challenges", {
        method: "POST",
        body: JSON.stringify(form),
      });
    }

    setForm(emptyChallenge);
    setEditingId(null);
    load();
  }

  async function remove(id) {
    if (!confirm("Видалити челендж?")) return;

    await adminRequest(`/challenges/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  const getDifficultyLabel = (difficulty) => {
    if (difficulty === "easy") return "Легкий";
    if (difficulty === "medium") return "Середній";
    if (difficulty === "hard") return "Складний";
    return difficulty;
  };

  const getStatusLabel = (status) => {
    if (status === "active") return "Активний";
    if (status === "inactive") return "Неактивний";
    return status;
  };

  return (
    <AdminLayout
      title="Керування челенджами"
      subtitle="Налаштування XP-нагород, дедлайнів, складності, бейджів і статусів."
    >
      <form className="admin-form-grid" onSubmit={save}>
        <input
          placeholder="Назва челенджу"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          required
        />

        <input
          placeholder="Бейдж"
          value={form.badge}
          onChange={(e) => set("badge", e.target.value)}
        />

        <input
          type="number"
          placeholder="XP-нагорода"
          value={form.xp_reward}
          onChange={(e) => set("xp_reward", e.target.value)}
        />

        <input
          type="date"
          value={form.deadline || ""}
          onChange={(e) => set("deadline", e.target.value)}
        />

        <select
          value={form.difficulty}
          onChange={(e) => set("difficulty", e.target.value)}
        >
          <option value="easy">Легкий</option>
          <option value="medium">Середній</option>
          <option value="hard">Складний</option>
        </select>

        <select
          value={form.status}
          onChange={(e) => set("status", e.target.value)}
        >
          <option value="active">Активний</option>
          <option value="inactive">Неактивний</option>
        </select>

        <textarea
          placeholder="Опис челенджу"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />

        <button>
          {editingId ? "Зберегти челендж" : "Створити челендж"}
        </button>
      </form>

      <section className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Бейдж</th>
                <th>Назва</th>
                <th>XP</th>
                <th>Складність</th>
                <th>Дедлайн</th>
                <th>Статус</th>
                <th>Дії</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.badge}</td>
                  <td>{item.title}</td>
                  <td>{item.xp_reward}</td>
                  <td>{getDifficultyLabel(item.difficulty)}</td>
                  <td>
                    {item.deadline
                      ? new Date(item.deadline).toLocaleDateString("uk-UA")
                      : "—"}
                  </td>
                  <td>
                    <span className={`admin-status ${item.status}`}>
                      {getStatusLabel(item.status)}
                    </span>
                  </td>
                  <td className="admin-actions">
                    <button
                      onClick={() => {
                        setEditingId(item.id);
                        setForm({ ...emptyChallenge, ...item });
                      }}
                    >
                      Редагувати
                    </button>

                    <button
                      className="danger"
                      onClick={() => remove(item.id)}
                    >
                      Видалити
                    </button>
                  </td>
                </tr>
              ))}

              {!items.length && (
                <tr>
                  <td colSpan="7" className="admin-empty-row">
                    Челенджів ще немає.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}