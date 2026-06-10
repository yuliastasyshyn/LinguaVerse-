import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout.jsx";
import { adminRequest } from "./adminApi.js";
import "./Admin.css";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);

  async function loadUsers(value = search) {
    try {
      setError("");
      const data = await adminRequest(
        `/users?search=${encodeURIComponent(value)}`
      );
      setUsers(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadUsers("");
  }, []);

  async function patchUser(id, body) {
    try {
      const updated = await adminRequest(`/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...updated } : u))
      );

      setEditing(null);
    } catch (err) {
      alert(err.message);
    }
  }

  async function resetPassword(id) {
    if (!confirm("Скинути пароль користувача?")) return;

    try {
      const data = await adminRequest(`/users/${id}/reset-password`, {
        method: "PATCH",
      });

      alert(`Тимчасовий пароль: ${data.temporaryPassword}`);
    } catch (err) {
      alert(err.message);
    }
  }

  async function deleteUser(id) {
    if (!confirm("Ви точно хочете видалити цього користувача?")) return;

    try {
      await adminRequest(`/users/${id}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  const getRoleLabel = (role) => {
    if (role === "admin") return "Адміністратор";
    return "Користувач";
  };

  const getStatusLabel = (status) => {
    if (status === "blocked") return "Заблокований";
    if (status === "active") return "Активний";
    return status;
  };

  return (
    <AdminLayout
      title="Керування користувачами"
      subtitle="Ролі, статуси, щоденні цілі, прогрес і дії над користувачами."
    >
      <div className="admin-toolbar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Пошук за ім’ям або email..."
        />

        <button onClick={() => loadUsers(search)}>Пошук</button>
      </div>

      {error && <div className="admin-alert">{error}</div>}

      <section className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Аватар</th>
                <th>Ім’я</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Статус</th>
                <th>Денна ціль</th>
                <th>Прогрес</th>
                <th>Дата реєстрації</th>
                <th>Дії</th>
              </tr>
            </thead>

            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="admin-avatar">
                      {u.name?.[0]?.toUpperCase() || "?"}
                    </div>
                  </td>

                  <td>
                    {editing === u.id ? (
                      <input defaultValue={u.name} id={`name-${u.id}`} />
                    ) : (
                      u.name
                    )}
                  </td>

                  <td>
                    {editing === u.id ? (
                      <input defaultValue={u.email} id={`email-${u.id}`} />
                    ) : (
                      u.email
                    )}
                  </td>

                  <td>
                    <select
                      value={u.role}
                      onChange={(e) =>
                        patchUser(u.id, { role: e.target.value })
                      }
                    >
                      <option value="user">Користувач</option>
                      <option value="admin">Адміністратор</option>
                    </select>
                  </td>

                  <td>
                    <span className={`admin-status ${u.status}`}>
                      {getStatusLabel(u.status)}
                    </span>
                  </td>

                  <td>
                    {editing === u.id ? (
                      <input
                        type="number"
                        defaultValue={u.daily_goal}
                        id={`goal-${u.id}`}
                      />
                    ) : (
                      `${u.daily_goal} хв`
                    )}
                  </td>

                  <td>
                    <div className="admin-progress">
                      <i style={{ width: `${u.progress_percent || 0}%` }} />
                    </div>
                    {u.progress_percent || 0}%
                  </td>

                  <td>{new Date(u.created_at).toLocaleDateString("uk-UA")}</td>

                  <td className="admin-actions">
                    {editing === u.id ? (
                      <button
                        onClick={() =>
                          patchUser(u.id, {
                            name: document.getElementById(`name-${u.id}`)
                              .value,
                            email: document.getElementById(`email-${u.id}`)
                              .value,
                            daily_goal: document.getElementById(
                              `goal-${u.id}`
                            ).value,
                          })
                        }
                      >
                        Зберегти
                      </button>
                    ) : (
                      <button onClick={() => setEditing(u.id)}>
                        Редагувати
                      </button>
                    )}

                    <button
                      onClick={() =>
                        patchUser(u.id, {
                          status:
                            u.status === "blocked" ? "active" : "blocked",
                        })
                      }
                    >
                      {u.status === "blocked"
                        ? "Розблокувати"
                        : "Заблокувати"}
                    </button>

                    <button onClick={() => resetPassword(u.id)}>
                      Скинути пароль
                    </button>

                    <button
                      className="danger"
                      onClick={() => deleteUser(u.id)}
                    >
                      Видалити
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}