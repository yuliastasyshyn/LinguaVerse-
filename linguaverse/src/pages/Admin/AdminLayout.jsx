import { NavLink } from "react-router-dom";

const adminLinks = [
  ["/admin", "Dashboard"],
  ["/admin/users", "Users"],
  ["/admin/lessons", "Lessons"],
  ["/admin/challenges", "Challenges"],
  ["/admin/rooms", "Rooms"],
  ["/admin/reviews", "Reviews"],
  ["/admin/reports", "Reports"],
  ["/admin/settings", "Settings"],
];

export default function AdminLayout({ title, subtitle, action, children }) {
  return (
    <div className="admin-page">
      <div className="admin-topbar">
        <div>
          <p className="admin-kicker">LinguaVerse.AI Admin</p>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>

      <div className="admin-tabs">
        {adminLinks.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === "/admin"}>
            {label}
          </NavLink>
        ))}
      </div>

      {children}
    </div>
  );
}
