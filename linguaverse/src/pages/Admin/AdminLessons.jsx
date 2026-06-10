import { useEffect, useMemo, useState } from "react";
import AdminLayout from "./AdminLayout.jsx";
import { adminRequest } from "./adminApi.js";
import "./Admin.css";

const emptyLesson = {
  title: "",
  description: "",
  language: "English",
  level: "A1",
  duration: 10,
  category: "General",
  tags: "",
  content: "",
  status: "published",
  xp: 20,
  vocabularyText: "",
  quizQuestion: "",
  quizOptionsText: "",
  correctIndex: 0,
  notes: "",
};

function arrayToLines(value) {
  if (Array.isArray(value)) return value.join("\n");
  if (!value) return "";
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.join("\n") : "";
  } catch {
    return "";
  }
}

function quizToForm(quiz) {
  if (!quiz) {
    return { quizQuestion: "", quizOptionsText: "", correctIndex: 0 };
  }

  let parsed = quiz;

  if (typeof quiz === "string") {
    try {
      parsed = JSON.parse(quiz);
    } catch {
      parsed = {};
    }
  }

  return {
    quizQuestion: parsed?.question || "",
    quizOptionsText: Array.isArray(parsed?.options)
      ? parsed.options.join("\n")
      : "",
    correctIndex: Number.isFinite(Number(parsed?.correctIndex))
      ? Number(parsed.correctIndex)
      : 0,
  };
}

function makePayload(form) {
  const vocabulary = String(form.vocabularyText || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  const quizOptions = String(form.quizOptionsText || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  const quiz =
    form.quizQuestion.trim() && quizOptions.length
      ? {
          question: form.quizQuestion.trim(),
          options: quizOptions,
          correctIndex: Math.min(
            Math.max(Number(form.correctIndex) || 0, 0),
            Math.max(quizOptions.length - 1, 0)
          ),
        }
      : {};

  return {
    title: form.title.trim(),
    description: form.description,
    language: form.language || "English",
    level: form.level || "A1",
    duration: Number(form.duration) || 10,
    category: form.category || "General",
    tags: form.tags || "",
    content: form.content || "",
    status: form.status || "published",
    xp: Number(form.xp) || 20,
    vocabulary,
    quiz,
    notes: form.notes || "",
  };
}

export default function AdminLessons() {
  const [lessons, setLessons] = useState([]);
  const [form, setForm] = useState(emptyLesson);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setError("");
      const data = await adminRequest("/lessons");
      setLessons(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(e) {
    e.preventDefault();

    if (!form.title.trim()) {
      alert("Введіть назву уроку");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = makePayload(form);

      if (editingId) {
        await adminRequest(`/lessons/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await adminRequest("/lessons", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setForm(emptyLesson);
      setEditingId(null);
      await load();
      alert(editingId ? "Урок збережено" : "Урок створено");
    } catch (err) {
      setError(err.message);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm("Видалити урок?")) return;

    try {
      await adminRequest(`/lessons/${id}`, { method: "DELETE" });
      setLessons((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  function edit(lesson) {
    const quizFields = quizToForm(lesson.quiz);

    setEditingId(lesson.id);
    setForm({
      ...emptyLesson,
      title: lesson.title || "",
      description: lesson.description || "",
      language: lesson.language || "English",
      level: lesson.level || "A1",
      duration: Number(lesson.duration) || 10,
      category: lesson.category || "General",
      tags: lesson.tags || "",
      content: lesson.content || "",
      status: lesson.status || "published",
      xp: Number(lesson.xp) || 20,
      vocabularyText: arrayToLines(lesson.vocabulary),
      notes: lesson.notes || "",
      ...quizFields,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyLesson);
  }

  const previewVocabulary = useMemo(() => {
    return String(form.vocabularyText || "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }, [form.vocabularyText]);

  const previewOptions = useMemo(() => {
    return String(form.quizOptionsText || "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }, [form.quizOptionsText]);

  return (
    <AdminLayout
      title="Керування уроками"
      subtitle="Створення та редагування уроків, опису, контенту, слів, інтерактивних карток і тестів."
    >
      {error && <div className="admin-alert">{error}</div>}

      <form className="admin-lesson-editor" onSubmit={save}>
        <div className="admin-editor-section">
          <div className="admin-section-heading">
            <h2>{editingId ? "Редагування уроку" : "Створення нового уроку"}</h2>
            <p>
              Усі дані зберігаються в PostgreSQL і відображаються на сторінці уроків.
            </p>
          </div>

          <div className="admin-form-grid">
            <input
              placeholder="Назва уроку"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              required
            />

            <select
              value={form.language}
              onChange={(e) => updateField("language", e.target.value)}
            >
              <option value="English">Англійська</option>
              <option value="Spanish">Іспанська</option>
              <option value="French">Французька</option>
              <option value="Italian">Італійська</option>
              <option value="German">Німецька</option>
              <option value="Portuguese">Португальська</option>
            </select>

            <select
              value={form.level}
              onChange={(e) => updateField("level", e.target.value)}
            >
              {["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>

            <input
              type="number"
              min="1"
              placeholder="Тривалість, хв"
              value={form.duration}
              onChange={(e) => updateField("duration", e.target.value)}
            />

            <input
              type="number"
              min="0"
              placeholder="XP"
              value={form.xp}
              onChange={(e) => updateField("xp", e.target.value)}
            />

            <select
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
            >
              <option value="General">Загальна</option>
              <option value="Grammar">Граматика</option>
              <option value="Vocabulary">Словниковий запас</option>
              <option value="Speaking">Говоріння</option>
              <option value="Writing">Письмо</option>
              <option value="Reading">Читання</option>
              <option value="Listening">Аудіювання</option>
              <option value="Practice">Практика</option>
            </select>

            <input
              placeholder="Теги"
              value={form.tags}
              onChange={(e) => updateField("tags", e.target.value)}
            />

            <select
              value={form.status}
              onChange={(e) => updateField("status", e.target.value)}
            >
              <option value="draft">Чернетка</option>
              <option value="published">Опубліковано</option>
              <option value="hidden">Приховано</option>
            </select>

            <textarea
              placeholder="Короткий опис уроку"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
            />

            <textarea
              placeholder="Вміст уроку. Наприклад: У цьому уроці користувач навчиться говорити про сім'ю..."
              value={form.content}
              onChange={(e) => updateField("content", e.target.value)}
            />

            <textarea
              className="admin-big-textarea"
              placeholder={
                "Слова та вирази. Кожен рядок — окрема картка:\nFamily - сім'я\nMother - мама\nFriend - друг"
              }
              value={form.vocabularyText}
              onChange={(e) => updateField("vocabularyText", e.target.value)}
            />

            <input
              className="admin-wide-field"
              placeholder="Питання тесту. Наприклад: Яке слово означає 'друг' англійською?"
              value={form.quizQuestion}
              onChange={(e) => updateField("quizQuestion", e.target.value)}
            />

            <textarea
              className="admin-big-textarea"
              placeholder={
                "Варіанти відповіді. Кожен рядок — окремий варіант:\nFamily\nFriend\nMother\nTeacher"
              }
              value={form.quizOptionsText}
              onChange={(e) => updateField("quizOptionsText", e.target.value)}
            />

            <input
              type="number"
              min="0"
              placeholder="Номер правильної відповіді з нуля"
              value={form.correctIndex}
              onChange={(e) => updateField("correctIndex", e.target.value)}
            />

            <textarea
              placeholder="Службові нотатки або додатковий текст"
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
            />

            <div className="admin-form-actions">
              <button type="submit" disabled={saving}>
                {saving
                  ? "Збереження..."
                  : editingId
                  ? "Зберегти урок"
                  : "Створити урок"}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="admin-secondary-btn"
                  onClick={cancelEdit}
                >
                  Скасувати
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="admin-preview-card">
          <h3>Попередній перегляд уроку</h3>
          <p>
            <strong>{form.title || "Назва уроку"}</strong>
          </p>
          <p>{form.description || "Опис уроку..."}</p>

          <div className="admin-preview-meta">
            <span>{form.level}</span>
            <span>+{Number(form.xp) || 0} XP</span>
            <span>{Number(form.duration) || 0} хв</span>
          </div>

          <h4>Слова та вирази</h4>
          {previewVocabulary.length ? (
            <ul>
              {previewVocabulary.slice(0, 6).map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="admin-muted">Поки немає слів.</p>
          )}

          <h4>Тест</h4>
          <p>{form.quizQuestion || "Питання ще не задано."}</p>

          {previewOptions.length ? (
            <ol>
              {previewOptions.map((option, index) => (
                <li
                  key={`${option}-${index}`}
                  className={
                    Number(form.correctIndex) === index
                      ? "admin-correct-option"
                      : ""
                  }
                >
                  {option}
                </li>
              ))}
            </ol>
          ) : (
            <p className="admin-muted">Поки немає варіантів відповіді.</p>
          )}
        </div>
      </form>

      <section className="admin-panel">
        <div className="admin-panel-title">
          <h2>Уроки в базі даних</h2>
          <p className="admin-muted">
            Усі створені уроки мають відображатися на сторінці уроків.
          </p>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Назва</th>
                <th>Мова</th>
                <th>Рівень</th>
                <th>Тривалість</th>
                <th>XP</th>
                <th>Слова</th>
                <th>Тест</th>
                <th>Статус</th>
                <th>Дії</th>
              </tr>
            </thead>

            <tbody>
              {lessons.map((lesson) => {
                const vocabularyCount = Array.isArray(lesson.vocabulary)
                  ? lesson.vocabulary.length
                  : 0;

                const quiz =
                  typeof lesson.quiz === "object" && lesson.quiz
                    ? lesson.quiz
                    : {};

                const hasQuiz = Boolean(
                  quiz.question &&
                    Array.isArray(quiz.options) &&
                    quiz.options.length
                );

                return (
                  <tr key={lesson.id}>
                    <td>
                      <strong>{lesson.title}</strong>
                      <br />
                      <small>{lesson.description}</small>
                    </td>
                    <td>{lesson.language}</td>
                    <td>{lesson.level}</td>
                    <td>{lesson.duration} хв</td>
                    <td>{lesson.xp || 0}</td>
                    <td>{vocabularyCount}</td>
                    <td>{hasQuiz ? "Так" : "Ні"}</td>
                    <td>
                      <span className={`admin-status ${lesson.status}`}>
                        {lesson.status === "published"
                          ? "Опубліковано"
                          : lesson.status === "draft"
                          ? "Чернетка"
                          : lesson.status === "hidden"
                          ? "Приховано"
                          : lesson.status}
                      </span>
                    </td>
                    <td className="admin-actions">
                      <button type="button" onClick={() => edit(lesson)}>
                        Редагувати
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => remove(lesson.id)}
                      >
                        Видалити
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!lessons.length && (
                <tr>
                  <td colSpan="9" className="admin-empty-row">
                    Уроків ще немає. Створіть перший урок у формі зверху.
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