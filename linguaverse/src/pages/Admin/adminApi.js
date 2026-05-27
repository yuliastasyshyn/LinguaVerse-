const API_URL = "http://localhost:4000";

export async function adminRequest(path, options = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_URL}/api/admin${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Admin request failed");
  }

  return data;
}
