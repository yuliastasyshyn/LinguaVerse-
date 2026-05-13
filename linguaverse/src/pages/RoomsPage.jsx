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
    return <div className="loading">Loading rooms...</div>;
  }

  return (
    <div className="rooms-page">
      <div className="rooms-header">
        <h1 className="rooms-title">Conversation Rooms</h1>
        <p className="rooms-subtitle">Join a room and start practicing</p>
      </div>

      <div className="rooms-filters">
        <input
          type="text"
          placeholder="🔍 Search rooms..."
          className="filter-search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          className="filter-select"
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
        >
          <option>All Topics</option>
          <option>Daily Life</option>
          <option>Movies</option>
          <option>Technology</option>
          <option>Travel</option>
          <option>Business</option>
          <option>Food</option>
          <option>General</option>
          <option>Sports</option>
        </select>

        <select
          className="filter-select"
          value={languageFilter}
          onChange={(e) => setLanguageFilter(e.target.value)}
        >
          <option>All Languages</option>
          <option>English</option>
          <option>Spanish</option>
          <option>French</option>
          <option>Italian</option>
          <option>German</option>
          <option>Portuguese</option>
        </select>

        <select
          className="filter-select"
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
        >
          <option>All Levels</option>
          <option>A1</option>
          <option>A2</option>
          <option>B1</option>
          <option>B2</option>
          <option>C1</option>
        </select>

        <button className="btn-create" onClick={handleCreateRoom}>
          + Create Room
        </button>
      </div>

      <div className="rooms-grid">
        {filteredRooms.length === 0 ? (
          <div className="no-rooms">No rooms found.</div>
        ) : (
          filteredRooms.map((room) => (
            <div key={room.id} className="room-card">
              <div className="room-card-header">
                <span
                  className={`room-level level-${(room.level || "a1").toLowerCase()}`}
                >
                  {room.level || "A1"}
                </span>
                <span className="room-topic">{room.topic || "General"}</span>
              </div>

              <h3 className="room-name">{room.title || room.name || "Untitled Room"}</h3>

              <div className="room-details">
                <span className="room-language">
                  🌐 {room.language || "English"}
                </span>
                <span className="room-participants">
                  👥 {room.participants ?? 0} / {room.max_participants ?? 10} participants
                </span>
              </div>

              {room.description ? (
                <p className="room-description">{room.description}</p>
              ) : null}

              <button
                className="btn-join"
                onClick={() => handleJoinRoom(room.id)}
              >
                Join Room
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}