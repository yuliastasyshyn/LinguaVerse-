
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateRoomPage.css";

export default function CreateRoomPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [formData, setFormData] = useState({
    name: "",
    level: "B1",
    topic: "General",
    language: "English",
    maxParticipants: 10,
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:4000/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        navigate("/rooms");
      } else {
        setError(data.message || "Не вдалося створити кімнату");
      }
    } catch (err) {
      setError("Помилка мережі. Спробуйте ще раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-room-page">
      <div className="create-room-card">
        <h1 className="create-room-title">Створити нову кімнату</h1>
        <p className="create-room-subtitle">
          Налаштуйте простір для мовної практики
        </p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="create-room-form">
          <div className="form-group">
            <label>Назва кімнати</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Наприклад: Англійський розмовний клуб"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Рівень</label>
              <select
                name="level"
                value={formData.level}
                onChange={handleChange}
              >
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
                <option value="C1">C1</option>
              </select>
            </div>

            <div className="form-group">
              <label>Тема</label>
              <select
                name="topic"
                value={formData.topic}
                onChange={handleChange}
              >
                <option value="General">Загальна</option>
                <option value="Daily Life">Повсякденне життя</option>
                <option value="Movies">Фільми</option>
                <option value="Technology">Технології</option>
                <option value="Travel">Подорожі</option>
                <option value="Business">Бізнес</option>
                <option value="Food">Їжа</option>
                <option value="Sports">Спорт</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Мова</label>
              <select
                name="language"
                value={formData.language}
                onChange={handleChange}
              >
                <option value="English">Англійська</option>
                <option value="Spanish">Іспанська</option>
                <option value="French">Французька</option>
                <option value="Italian">Італійська</option>
                <option value="German">Німецька</option>
                <option value="Portuguese">Португальська</option>
              </select>
            </div>

            <div className="form-group">
              <label>Максимальна кількість учасників</label>
              <input
                type="number"
                name="maxParticipants"
                value={formData.maxParticipants}
                onChange={handleChange}
                min="2"
                max="50"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Опис кімнати (необов’язково)</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Коротко опишіть тему або мету цієї кімнати"
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => navigate("/rooms")}
            >
              Скасувати
            </button>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? "Створення..." : "Створити кімнату"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}