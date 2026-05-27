import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./RoomsPage.css";

export default function RoomsPage() {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [topicFilter, setTopicFilter] = useState("All Topics");
  const [languageFilter, setLanguageFilter] = useState("All Languages");
  const [levelFilter, setLevelFilter] = useState("All Levels");
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/rooms", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        setRooms(Array.isArray(data) ? data : []);
      } else {
        console.error("Failed to fetch rooms:", data);
        setRooms([]);
      }
    } catch (err) {
      console.error("Error fetching rooms:", err);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = (roomId) => {
    navigate(`/chat/${roomId}`);
  };

  const handleCreateRoom = () => {
    navigate("/rooms/create");
  };

  const translateTopic = (topic) => {
    const topics = {
      "Daily Life": "Повсякденне життя",
      Movies: "Фільми",
      Technology: "Технології",
      Travel: "Подорожі",
      Business: "Бізнес",
      Food: "Їжа",
      General: "Загальна",
      Sports: "Спорт",
    };

    return topics[topic] || topic || "Загальна";
  };

  const translateLanguage = (language) => {
    const languages = {
      English: "Англійська",
      Spanish: "Іспанська",
      French: "Французька",
      Italian: "Італійська",
      German: "Німецька",
      Portuguese: "Португальська",
    };

    return languages[language] || language || "Англійська";
  };

  const filteredRooms = rooms.filter((room) => {
    const roomTitle = (room?.title || room?.name || "").toLowerCase();
    const roomTopic = (room?.topic || "").toLowerCase();
    const roomLanguage = room?.language || "";
    const roomLevel = room?.level || "";

    const search = searchTerm.toLowerCase();

    const matchesSearch =
      roomTitle.includes(search) || roomTopic.includes(search);

    const matchesTopic =
      topicFilter === "All Topics" || room?.topic === topicFilter;

    const matchesLanguage =
      languageFilter === "All Languages" || roomLanguage === languageFilter;

    const matchesLevel =
      levelFilter === "All Levels" || roomLevel === levelFilter;

    return matchesSearch && matchesTopic && matchesLanguage && matchesLevel;
  });

  if (loading) {
    return <div className="loading">Завантаження кімнат...</div>;
  }

  return (
    <div className="rooms-page">
      <div className="rooms-header">
        <h1 className="rooms-title">Мовні кімнати</h1>
        <p className="rooms-subtitle">
          Приєднайтеся до кімнати та практикуйте мову
        </p>
      </div>

      <div className="rooms-filters">
        <input
          type="text"
          placeholder="🔍 Пошук кімнат..."
          className="filter-search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          className="filter-select"
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
        >
          <option value="All Topics">Усі теми</option>
          <option value="Daily Life">Повсякденне життя</option>
          <option value="Movies">Фільми</option>
          <option value="Technology">Технології</option>
          <option value="Travel">Подорожі</option>
          <option value="Business">Бізнес</option>
          <option value="Food">Їжа</option>
          <option value="General">Загальна</option>
          <option value="Sports">Спорт</option>
        </select>

        <select
          className="filter-select"
          value={languageFilter}
          onChange={(e) => setLanguageFilter(e.target.value)}
        >
          <option value="All Languages">Усі мови</option>
          <option value="English">Англійська</option>
          <option value="Spanish">Іспанська</option>
          <option value="French">Французька</option>
          <option value="Italian">Італійська</option>
          <option value="German">Німецька</option>
          <option value="Portuguese">Португальська</option>
        </select>

        <select
          className="filter-select"
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
        >
          <option value="All Levels">Усі рівні</option>
          <option value="A1">A1</option>
          <option value="A2">A2</option>
          <option value="B1">B1</option>
          <option value="B2">B2</option>
          <option value="C1">C1</option>
        </select>

        <button className="btn-create" onClick={handleCreateRoom}>
          + Створити кімнату
        </button>
      </div>

      <div className="rooms-grid">
        {filteredRooms.length === 0 ? (
          <div className="no-rooms">Кімнат не знайдено.</div>
        ) : (
          filteredRooms.map((room) => (
            <div key={room.id} className="room-card">
              <div className="room-card-header">
                <span
                  className={`room-level level-${(room.level || "a1").toLowerCase()}`}
                >
                  {room.level || "A1"}
                </span>

                <span className="room-topic">
                  {translateTopic(room.topic)}
                </span>
              </div>

              <h3 className="room-name">
                {room.title || room.name || "Кімната без назви"}
              </h3>

              <div className="room-details">
                <span className="room-language">
                  🌐 {translateLanguage(room.language)}
                </span>

                <span className="room-participants">
                  👥 {room.participants ?? 0} /{" "}
                  {room.max_participants ?? 10} учасників
                </span>
              </div>

              {room.description ? (
                <p className="room-description">{room.description}</p>
              ) : null}

              <button
                className="btn-join"
                onClick={() => handleJoinRoom(room.id)}
              >
                Приєднатися
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}