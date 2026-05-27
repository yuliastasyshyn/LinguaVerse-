
import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./Navbar.css";

function Icon({ type }) {
  const icons = {
    home: (
      <>
        <path d="M3.5 11.5L12 4l8.5 7.5" />
        <path d="M5.5 10.5V20h13v-9.5" />
        <path d="M9.5 20v-6h5v6" />
      </>
    ),

    lessons: (
      <>
        <path d="M5 5.5h9a3 3 0 0 1 3 3V20H8a3 3 0 0 0-3 3V5.5Z" />
        <path d="M19 7h1.5A1.5 1.5 0 0 1 22 8.5V20h-5" />
        <path d="M8 9h5" />
        <path d="M8 13h5" />
      </>
    ),

    ai: (
      <>
        <rect x="5" y="8" width="14" height="11" rx="4" />
        <path d="M12 8V4" />
        <path d="M8.5 4h7" />
        <circle cx="9.5" cy="13.5" r="1" />
        <circle cx="14.5" cy="13.5" r="1" />
        <path d="M9 17h6" />
      </>
    ),

    mic: (
      <>
        <rect x="9" y="3.5" width="6" height="11" rx="3" />
        <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
        <path d="M12 18v3" />
      </>
    ),

    writing: (
      <>
        <path d="M4 20h5l10.5-10.5a2.2 2.2 0 0 0-3.1-3.1L6 16.8 4 20Z" />
        <path d="M14.5 8.5l3 3" />
      </>
    ),

    dictionary: (
      <>
        <path d="M6 4.5h10a2 2 0 0 1 2 2V21H8a2 2 0 0 1-2-2V4.5Z" />
        <path d="M8 4.5v13.7A2.8 2.8 0 0 0 10.8 21" />
      </>
    ),

    translator: (
      <>
        <path d="M4 7h16" />
        <path d="M9 5c0 6-2 10-5 13" />
        <path d="M15 11h6" />
        <path d="M18 8v6" />
      </>
    ),

    rooms: (
      <>
        <path d="M7 15.5H5.5A3.5 3.5 0 0 1 2 12V8.5A3.5 3.5 0 0 1 5.5 5h7A3.5 3.5 0 0 1 16 8.5V12a3.5 3.5 0 0 1-3.5 3.5H10l-3 3v-3Z" />
      </>
    ),

    challenges: (
      <>
        <path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" />
        <path d="M12 12v4" />
      </>
    ),

    progress: (
      <>
        <path d="M4 20V10" />
        <path d="M10 20V5" />
        <path d="M16 20v-8" />
      </>
    ),

    profile: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
      </>
    ),

    admin: (
      <>
        <path d="M4 5h16" />
        <path d="M4 12h16" />
        <path d="M4 19h16" />
        <path d="M8 5v14" />
      </>
    ),

    logout: (
      <>
        <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" />
        <path d="M15 8l4 4-4 4" />
        <path d="M19 12H9" />
      </>
    ),
  };

  return (
    <svg className="nav-svg" viewBox="0 0 24 24" fill="none">
      {icons[type]}
    </svg>
  );
}

export default function Navbar() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    return JSON.parse(localStorage.getItem("user")) || {};
  });

  useEffect(() => {
    const syncUser = () => {
      setUser(JSON.parse(localStorage.getItem("user")) || {});
    };

    window.addEventListener("userUpdated", syncUser);

    return () => {
      window.removeEventListener("userUpdated", syncUser);
    };
  }, []);

  const firstLetter = user?.name?.charAt(0)?.toUpperCase() || "?";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const isAdmin = user?.role === "admin";

  const navItems = [
    { to: "/home", label: "Головна", icon: "home" },
    { to: "/lessons", label: "Уроки", icon: "lessons" },
    { to: "/chat", label: "AI-Помічник", icon: "ai" },
    { to: "/pronunciation", label: "Вимова", icon: "mic" },
    { to: "/writing", label: "Письмо", icon: "writing" },
    { to: "/dictionary", label: "Словник", icon: "dictionary" },

    // НОВИЙ ПУНКТ
    { to: "/translator", label: "Перекладач", icon: "translator" },

    { to: "/rooms", label: "Кімнати", icon: "rooms" },
    { to: "/challenges", label: "Челенджі", icon: "challenges" },
    { to: "/progress", label: "Прогрес", icon: "progress" },
    { to: "/profile", label: "Профіль", icon: "profile" },
    ...(isAdmin ? [{ to: "/admin", label: "Адміністративна панель", icon: "admin" }] : []),
  ];

  return (
    <aside className="navbar-vertical">
      <div className="navbar-logo" onClick={() => navigate("/home")}>
        <span className="logo-mark">L</span>
        <span className="logo-text">LinguaVerse.AI</span>
      </div>

      <nav className="navbar-links-vertical">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className="nav-item-vertical">
            <span className="nav-icon">
              <Icon type={item.icon} />
            </span>

            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="navbar-footer">
        <div className="user-info">
          <div className="avatar-vertical">{firstLetter}</div>

          <span className="username-vertical">
            {user?.name || "Користувач"}
          </span>
        </div>

        <button className="logout-btn-vertical" onClick={handleLogout}>
          <Icon type="logout" />
          <span>Вийти</span>
        </button>
      </div>
    </aside>
  );
}

