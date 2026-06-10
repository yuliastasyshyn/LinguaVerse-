import { useState } from "react";
import "../styles/Auth.css";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("http://localhost:4000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoading(false);
        setError(data.message || "Login failed");
        return;
      }

     
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

    
      navigate("/home");

    } catch (err) {
      setError("Server error. Try again later.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Увійти</h2>

        <form className="auth-form" onSubmit={handleLogin}>

          <input
            type="email"
            placeholder="Електронна пошта"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Пароль"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Loading..." : "Увійти"}
          </button>
        </form>

        <p className="switch-text" onClick={() => navigate("/register")}>
          Не маєте акаунту? <span>Зареєструватися</span>
        </p>
      </div>
    </div>
  );
}
