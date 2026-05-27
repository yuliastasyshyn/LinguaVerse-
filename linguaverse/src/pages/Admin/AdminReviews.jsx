import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout.jsx";
import { adminRequest } from "./adminApi.js";
import "./Admin.css";

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  async function load() { setReviews(await adminRequest("/reviews")); }
  useEffect(() => { load(); }, []);

  async function patch(id, body) { await adminRequest(`/reviews/${id}`, { method: "PATCH", body: JSON.stringify(body) }); load(); }
  async function remove(id) { if (confirm("Видалити відгук?")) { await adminRequest(`/reviews/${id}`, { method: "DELETE" }); load(); } }

  return (
    <AdminLayout title="Відгуки" subtitle="Approve, reject, delete fake review, mark featured.">
      <section className="admin-panel"><div className="admin-table-wrap"><table className="admin-table">
        <thead><tr><th>User</th><th>Email</th><th>Rating</th><th>Text</th><th>Status</th><th>Featured</th><th>Actions</th></tr></thead>
        <tbody>{reviews.map((r) => <tr key={r.id}>
          <td>{r.name}</td><td>{r.email}</td><td>{"⭐".repeat(Number(r.rating) || 1)}</td><td className="admin-text-cell">{r.text}</td><td><span className={`admin-status ${r.status}`}>{r.status}</span></td><td>{r.featured ? "Yes" : "No"}</td>
          <td className="admin-actions"><button onClick={() => patch(r.id, { status: "approved" })}>Approve</button><button onClick={() => patch(r.id, { status: "rejected" })}>Reject</button><button onClick={() => patch(r.id, { featured: !r.featured })}>Featured</button><button className="danger" onClick={() => remove(r.id)}>Delete</button></td>
        </tr>)}</tbody>
      </table></div></section>
    </AdminLayout>
  );
}
