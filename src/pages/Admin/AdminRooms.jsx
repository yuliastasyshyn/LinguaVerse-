import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout.jsx";
import { adminRequest } from "./adminApi.js";
import "./Admin.css";

export default function AdminRooms() {
  const [rooms, setRooms] = useState([]);

  async function load() {
    setRooms(await adminRequest("/rooms"));
  }

  useEffect(() => {
    load();
  }, []);

  async function changeStatus(id, status) {
    await adminRequest(`/rooms/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });

    load();
  }

  async function remove(id) {
    if (!confirm("Видалити кімнату?")) return;

    await adminRequest(`/rooms/${id}`, { method: "DELETE" });

    setRooms((prev) => prev.filter((r) => r.id !== id));
  }

  const getStatusLabel = (status) => {
    if (status === "active") return "Активна";
    if (status === "closed") return "Закрита";
    return status || "—";
  };

  const getTopicLabel = (topic) => {
    const topics = {
      General: "Загальна",
      "Daily Life": "Повсякденне життя",
      Movies: "Фільми",
      Technology: "Технології",
      Travel: "Подорожі",
      Business: "Бізнес",
      Food: "Їжа",
      Sports: "Спорт",
    };

    return topics[topic] || topic || "—";
  };

  return (
    <AdminLayout
      title="Модерація кімнат"
      subtitle="Керування кімнатами: автор, тема, статус і кількість повідомлень."
    >
      <section className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Кімната</th>
                <th>Автор</th>
                <th>Тема</th>
                <th>Повідомлення</th>
                <th>Статус</th>
                <th>Дії</th>
              </tr>
            </thead>

            <tbody>
              {rooms.map((room) => (
                <tr key={room.id}>
                  <td>{room.name || room.title || "Без назви"}</td>
                  <td>{room.creator_name || "—"}</td>
                  <td>{getTopicLabel(room.topic)}</td>
                  <td>{room.messages_count ?? 0}</td>
                  <td>
                    <span className={`admin-status ${room.status}`}>
                      {getStatusLabel(room.status)}
                    </span>
                  </td>
                  <td className="admin-actions">
                    <button
                      onClick={() =>
                        changeStatus(
                          room.id,
                          room.status === "closed" ? "active" : "closed"
                        )
                      }
                    >
                      {room.status === "closed" ? "Відкрити" : "Закрити"}
                    </button>

                    <button
                      className="danger"
                      onClick={() => remove(room.id)}
                    >
                      Видалити
                    </button>
                  </td>
                </tr>
              ))}

              {!rooms.length && (
                <tr>
                  <td colSpan="6" className="admin-empty-row">
                    Кімнат ще немає.
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