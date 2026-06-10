import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout.jsx";
import { adminRequest } from "./adminApi.js";
import "./Admin.css";

export default function AdminSettings() {
  const [settings, setSettings] = useState({});

  const fields = [
    ["app_name", "Назва застосунку"],
    ["maintenance_mode", "Режим технічного обслуговування"],
    ["default_daily_goal", "Щоденна ціль за замовчуванням"],
    ["daily_xp_limit", "Денний ліміт XP"],
    ["max_room_participants", "Максимальна кількість учасників у кімнаті"],
    ["supported_languages", "Підтримувані мови"],
  ];

  useEffect(() => {
    adminRequest("/settings").then(setSettings);
  }, []);

  const set = (k, v) => {
    setSettings((p) => ({ ...p, [k]: v }));
  };

  async function save(e) {
    e.preventDefault();

    const updated = await adminRequest("/settings", {
      method: "PATCH",
      body: JSON.stringify(settings),
    });

    setSettings(updated);
    alert("Налаштування збережено");
  }

  return (
    <AdminLayout
      title="Налаштування системи"
      subtitle="Керування параметрами платформи, XP, щоденними цілями, кімнатами та підтримуваними мовами."
    >
      <form className="admin-settings-form" onSubmit={save}>
        {fields.map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              value={settings[key] || ""}
              onChange={(e) => set(key, e.target.value)}
            />
          </label>
        ))}

        <button>Зберегти налаштування</button>
      </form>
    </AdminLayout>
  );
}