import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout.jsx";
import { adminRequest } from "./adminApi.js";
import "./Admin.css";

export default function AdminReports() {
  const [reports, setReports] = useState([]);

  async function load() {
    setReports(await adminRequest("/reports"));
  }

  useEffect(() => {
    load();
  }, []);

  async function status(id, value) {
    await adminRequest(`/reports/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: value }),
    });

    load();
  }

  const getReasonLabel = (reason) => {
    const reasons = {
      spam: "Спам",
      "offensive behavior": "Образлива поведінка",
      "fake content": "Неправдивий контент",
      "abusive messages": "Образливі повідомлення",
    };

    return reasons[reason] || reason || "—";
  };

  const getStatusLabel = (value) => {
    const statuses = {
      pending: "Очікує розгляду",
      reviewed: "Переглянуто",
      resolved: "Вирішено",
      rejected: "Відхилено",
    };

    return statuses[value] || value || "—";
  };

  const getTargetLabel = (type) => {
    const targets = {
      user: "Користувач",
      room: "Кімната",
      message: "Повідомлення",
      review: "Відгук",
      lesson: "Урок",
    };

    return targets[type] || type || "Об’єкт";
  };

  return (
    <AdminLayout
      title="Система скарг та звернень"
      subtitle="Перегляд і обробка скарг на спам, образливу поведінку, неправдивий контент та некоректні повідомлення."
    >
      <section className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Автор скарги</th>
                <th>Причина</th>
                <th>Зміст</th>
                <th>Об’єкт</th>
                <th>Статус</th>
                <th>Дата</th>
                <th>Дії</th>
              </tr>
            </thead>

            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.reporter_name || "—"}
                    <br />
                    <small>{r.reporter_email || "—"}</small>
                  </td>

                  <td>{getReasonLabel(r.reason)}</td>

                  <td className="admin-text-cell">{r.content || "—"}</td>

                  <td>
                    {getTargetLabel(r.target_type)} #{r.target_id || "—"}
                  </td>

                  <td>
                    <span className={`admin-status ${r.status}`}>
                      {getStatusLabel(r.status)}
                    </span>
                  </td>

                  <td>
                    {r.created_at
                      ? new Date(r.created_at).toLocaleDateString("uk-UA")
                      : "—"}
                  </td>

                  <td className="admin-actions">
                    <button onClick={() => status(r.id, "reviewed")}>
                      Переглянуто
                    </button>

                    <button onClick={() => status(r.id, "resolved")}>
                      Вирішити
                    </button>

                    <button
                      className="danger"
                      onClick={() => status(r.id, "rejected")}
                    >
                      Відхилити
                    </button>
                  </td>
                </tr>
              ))}

              {!reports.length && (
                <tr>
                  <td colSpan="7" className="admin-empty-row">
                    Скарг поки немає.
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