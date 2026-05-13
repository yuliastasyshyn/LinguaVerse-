import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./LessonsPage.css";

const lessonsData = [
  {
    id: 1,
    title: "Привітання та знайомство",
    level: "A1",
    duration: "10 хв",
    description: "Навчіться вітатися, представляти себе та ставити базові запитання.",
    status: "completed",
    progress: 100,
    xp: 20,
    category: "Базовий курс",
  },
  {
    id: 2,
    title: "Числа і час",
    level: "A1",
    duration: "12 хв",
    description: "Практика чисел, днів тижня, часу та простих часових конструкцій.",
    status: "in_progress",
    progress: 65,
    xp: 18,
    category: "Базовий курс",
  },
  {
    id: 3,
    title: "Сім'я та друзі",
    level: "A1",
    duration: "15 хв",
    description: "Лексика для розмови про родину, друзів та особисті стосунки.",
    status: "not_started",
    progress: 0,
    xp: 22,
    category: "Базовий курс",
  },
  {
    id: 4,
    title: "Щоденні справи",
    level: "A1",
    duration: "14 хв",
    description: "Опишіть свій день, звички та типові дії англійською мовою.",
    status: "not_started",
    progress: 0,
    xp: 24,
    category: "Практика",
  },
  {
    id: 5,
    title: "Їжа та напої",
    level: "A2",
    duration: "16 хв",
    description: "Замовлення в кафе, опис смаків, страв та побутових ситуацій.",
    status: "in_progress",
    progress: 35,
    xp: 25,
    category: "Практика",
  },
  {
    id: 6,
    title: "Подорожі",
    level: "A2",
    duration: "18 хв",
    description: "Фрази для аеропорту, готелю, дороги та спілкування під час подорожі.",
    status: "not_started",
    progress: 0,
    xp: 30,
    category: "Практика",
  },
  {
    id: 7,
    title: "Покупки",
    level: "A2",
    duration: "13 хв",
    description: "Як запитати ціну, розмір, колір та вести короткий діалог у магазині.",
    status: "not_started",
    progress: 0,
    xp: 20,
    category: "Ситуації",
  },
  {
    id: 8,
    title: "Розмова в кафе",
    level: "A2",
    duration: "11 хв",
    description: "Практика типових діалогів у кафе та ресторані з AI-помічником.",
    status: "completed",
    progress: 100,
    xp: 20,
    category: "Ситуації",
  },
];

const statusMap = {
  completed: "Завершено",
  in_progress: "В процесі",
  not_started: "Не почато",
};

const standardFlashcards = [
  { front: "Hello", back: "Привіт" },
  { front: "Thank you", back: "Дякую" },
  { front: "Please", back: "Будь ласка" },
  { front: "How are you?", back: "Як справи?" },
  { front: "Goodbye", back: "До побачення" },
];

export default function LessonsPage() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [activePath, setActivePath] = useState("standard");
  const [stats, setStats] = useState(null);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [customWords, setCustomWords] = useState([]);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // Завантажити уроки при монтуванні компонента
  useEffect(() => {
    fetchLessons();
    fetchStatistics();
  }, []);

  useEffect(() => {
    fetchCustomWords();
  }, []);

  const fetchCustomWords = async () => {
    try {
      const response = await fetch("http://localhost:4000/api/dictionary", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch custom words");

      const data = await response.json();
      setCustomWords(data.customWords || []);
    } catch (error) {
      console.error("Error fetching custom words:", error);
      setCustomWords([]);
    }
  };

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:4000/api/lessons", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setLessons(data);
    } catch (error) {
      console.error("Error fetching lessons:", error);
      // Fallback на локальні дані якщо бекенд недоступний
      setLessons(lessonsData);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch("http://localhost:4000/api/lessons/statistics", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  const filteredLessons = useMemo(() => {
    if (activeFilter === "all") return lessons;
    return lessons.filter((lesson) => lesson.status === activeFilter);
  }, [activeFilter, lessons]);

  const totalLessons = lessons.length;
  const completedLessons = lessons.filter((lesson) => lesson.status === "completed").length;
  const inProgressLessons = lessons.filter((lesson) => lesson.status === "in_progress").length;
  const totalProgress = totalLessons > 0
    ? Math.round(lessons.reduce((sum, lesson) => sum + lesson.progress, 0) / totalLessons)
    : 0;

  // Функція для запуску урока
  const handleLessonClick = async (lesson) => {
    try {
      if (lesson.status === "not_started") {
        // Стартуємо новий урок
        const response = await fetch(`http://localhost:4000/api/lessons/${lesson.id}/start`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const updatedLesson = await response.json();
          setLessons(lessons.map((l) => (l.id === updatedLesson.id ? updatedLesson : l)));
        }
      }
      // Переходимо на сторінку уроку
      navigate(`/lessons/${lesson.id}`);
    } catch (error) {
      console.error("Error updating lesson:", error);
      // Все одно переходимо на урок
      navigate(`/lessons/${lesson.id}`);
    }
  };

  const handleFlip = () => {
    setIsFlipped((prev) => !prev);
  };

  const handleNextCard = () => {
    setIsFlipped(false);
    setFlashcardIndex((current) => (current + 1) % standardFlashcards.length);
  };

  const handleCustomSubmit = async (event) => {
    event.preventDefault();
    const trimmedFront = newFront.trim();
    const trimmedBack = newBack.trim();

    if (!trimmedFront || !trimmedBack) {
      return;
    }

    try {
      const response = await fetch("http://localhost:4000/api/dictionary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ word: trimmedFront, translation: trimmedBack }),
      });

      if (!response.ok) throw new Error("Failed to add custom word");

      const data = await response.json();
      setCustomWords(data.customWords || []);
      setNewFront("");
      setNewBack("");
      setActivePath("custom");
    } catch (error) {
      console.error("Error adding custom word:", error);
    }
  };

  const handleRemoveCustom = async (id) => {
    try {
      const response = await fetch(`http://localhost:4000/api/dictionary/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete custom word");

      const data = await response.json();
      setCustomWords(data.customWords || []);
    } catch (error) {
      console.error("Error deleting custom word:", error);
    }
  };

  const currentFlashcard = standardFlashcards[flashcardIndex];

  if (loading) {
    return <div className="lessons-page"><p>Завантаження уроків...</p></div>;
  }

  const renderButtonText = (status) => {
    if (status === "completed") return "Повторити";
    if (status === "in_progress") return "Продовжити";
    return "Почати";
  };

  return (
    <div className="lessons-page">
      <section className="lessons-header">
        <div className="lessons-title-row">
          <div className="lessons-title-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v14H6.5A2.5 2.5 0 0 0 4 20.5V6.5Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M4 6.5A2.5 2.5 0 0 1 6.5 4H18v16H6.5A2.5 2.5 0 0 0 4 22.5V6.5Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path d="M12 6V18" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <div>
            <h1>Уроки</h1>
            <p>Оберіть урок та продовжуйте навчання у власному темпі</p>
          </div>
        </div>
      </section>

      <section className="lessons-overview-card">
        <div className="overview-top">
          <div>
            <h2>Ваш прогрес у курсі</h2>
            <p>Ви вже пройшли частину курсу та можете продовжити навчання</p>
          </div>
          <div className="overview-badge">
            <span>{stats?.completedLessons || completedLessons}/{stats?.totalLessons || totalLessons} уроків</span>
          </div>
        </div>

        <div className="course-progress-bar">
          <div
            className="course-progress-fill"
            style={{ width: `${stats?.totalProgress || totalProgress}%` }}
          />
        </div>

        <div className="overview-stats">
          <div className="overview-mini-card">
            <span className="overview-label">Завершено</span>
            <strong>{stats?.completedLessons || completedLessons}</strong>
          </div>
          <div className="overview-mini-card">
            <span className="overview-label">В процесі</span>
            <strong>{stats?.inProgressLessons || inProgressLessons}</strong>
          </div>
          <div className="overview-mini-card">
            <span className="overview-label">Прогрес курсу</span>
            <strong>{stats?.totalProgress || totalProgress}%</strong>
          </div>
        </div>
      </section>

      <section className="lessons-filters">
        <button
          className={`filter-btn ${activeFilter === "all" ? "active" : ""}`}
          onClick={() => setActiveFilter("all")}
        >
          Всі
        </button>
        <button
          className={`filter-btn ${activeFilter === "completed" ? "active" : ""}`}
          onClick={() => setActiveFilter("completed")}
        >
          Завершені
        </button>
        <button
          className={`filter-btn ${activeFilter === "in_progress" ? "active" : ""}`}
          onClick={() => setActiveFilter("in_progress")}
        >
          В процесі
        </button>
        <button
          className={`filter-btn ${activeFilter === "not_started" ? "active" : ""}`}
          onClick={() => setActiveFilter("not_started")}
        >
          Не початі
        </button>
      </section>

      <section className="lessons-path-tabs">
        <button
          type="button"
          className={`path-tab ${activePath === "standard" ? "active" : ""}`}
          onClick={() => setActivePath("standard")}
        >
          Стандартний шлях
        </button>
        <button
          type="button"
          className={`path-tab ${activePath === "custom" ? "active" : ""}`}
          onClick={() => setActivePath("custom")}
        >
          Власні слова
        </button>
      </section>

      {activePath === "standard" ? (
        <>
          <section className="flashcard-showcase">
            <div className="flashcard-header">
              <div>
                <h2>Ротаційні картки</h2>
                <p>Натисніть на картку, щоб побачити переклад, або переходьте до наступного слова.</p>
              </div>
              <div className="flashcard-controls">
                <button type="button" className="control-btn" onClick={handleFlip}>
                  Перевернути
                </button>
                <button type="button" className="control-btn" onClick={handleNextCard}>
                  Наступна картка
                </button>
              </div>
            </div>

            <div className="flashcard-sample-wrapper">
              <div
                className={`flashcard-sample ${isFlipped ? "flipped" : ""}`}
                onClick={handleFlip}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleFlip();
                  }
                }}
              >
                <div className="flashcard-face flashcard-front">
                  <span>{currentFlashcard.front}</span>
                </div>
                <div className="flashcard-face flashcard-back">
                  <span>{currentFlashcard.back}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="lessons-grid">
            {filteredLessons.map((lesson) => (
              <article
                className="lesson-card"
                key={lesson.id}
                onClick={() => handleLessonClick(lesson)}
              >
                <div className="lesson-card-top">
                  <div className="lesson-meta-row">
                    <span className="lesson-level">{lesson.level}</span>
                    <span className={`lesson-status lesson-status--${lesson.status}`}>
                      {statusMap[lesson.status]}
                    </span>
                  </div>

                  <h3>{lesson.title}</h3>
                  <p>{lesson.description}</p>
                </div>

                <div className="lesson-info-row">
                  <div className="lesson-info-item">
                    <span className="info-label">Тривалість</span>
                    <strong>{lesson.duration}</strong>
                  </div>
                  <div className="lesson-info-item">
                    <span className="info-label">XP</span>
                    <strong>{lesson.xp}</strong>
                  </div>
                  <div className="lesson-info-item">
                    <span className="info-label">Категорія</span>
                    <strong>{lesson.category}</strong>
                  </div>
                </div>

                <div className="lesson-progress-block">
                  <div className="lesson-progress-header">
                    <span>Прогрес</span>
                    <span>{lesson.progress}%</span>
                  </div>
                  <div className="lesson-progress-bar">
                    <div
                      className="lesson-progress-fill"
                      style={{ width: `${lesson.progress}%` }}
                    />
                  </div>
                </div>

                <button
                  className={`lesson-action-btn lesson-action-btn--${lesson.status}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLessonClick(lesson);
                  }}
                >
                  {renderButtonText(lesson.status)}
                </button>
              </article>
            ))}
          </section>
        </>
      ) : (
        <section className="custom-words-section">
          <div className="custom-words-header">
            <div>
              <h2>Власна колода</h2>
              <p>Додавайте свої слова для тренувань у окремому шляху.</p>
            </div>
          </div>

          <form className="custom-word-form" onSubmit={handleCustomSubmit}>
            <div className="form-row">
              <label>
                Слово / фраза
                <input
                  type="text"
                  value={newFront}
                  onChange={(event) => setNewFront(event.target.value)}
                  placeholder="Hello"
                />
              </label>
              <label>
                Переклад
                <input
                  type="text"
                  value={newBack}
                  onChange={(event) => setNewBack(event.target.value)}
                  placeholder="Привіт"
                />
              </label>
            </div>
            <button type="submit" className="add-word-btn">
              Додати слово
            </button>
          </form>

          {customWords.length > 0 ? (
            <div className="custom-cards-grid">
              {customWords.map((item) => (
                <div className="custom-card" key={item.id}>
                  <div className="custom-card-content">
                    <div>
                      <strong>{item.word || item.front}</strong>
                      <p>{item.translation || item.back}</p>
                    </div>
                    <button
                      type="button"
                      className="remove-word-btn"
                      onClick={() => handleRemoveCustom(item.id)}
                    >
                      Видалити
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="custom-empty">Ваша колода порожня. Додайте перше слово зверху.</p>
          )}
        </section>
      )}
    </div>
  );
}
