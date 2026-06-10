import { useMemo, useState } from "react";
import "../styles/Auth.css";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:4000";

export default function Register() {
  const navigate = useNavigate();

  const [step, setStep] = useState("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [passwordTouched, setPasswordTouched] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);

  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordRules = useMemo(() => {
    return [
      { label: "Мінімум 8 символів", valid: password.length >= 8 },
      { label: "Мінімум 1 велика літера", valid: /[A-ZА-ЯІЇЄҐ]/.test(password) },
      { label: "Мінімум 1 мала літера", valid: /[a-zа-яіїєґ]/.test(password) },
      { label: "Мінімум 1 цифра", valid: /\d/.test(password) },
      {
        label: "Мінімум 1 спеціальний символ: ! @ # $ %",
        valid: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
      },
    ];
  }, [password]);

  const isPasswordValid = passwordRules.every((rule) => rule.valid);
  const missingPasswordRules = passwordRules.filter((rule) => !rule.valid);

  const showPasswordHint =
    passwordTouched && password.length > 0 && !isPasswordValid;

  const showPasswordError =
    triedSubmit && password.length > 0 && !isPasswordValid;

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    setMsg("");
    setTriedSubmit(true);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Заповніть усі поля.");
      return;
    }

    if (!isPasswordValid) {
      setError("Пароль ще недостатньо надійний. Перевірте підказку нижче.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/api/auth/send-verification-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Не вдалося надіслати код підтвердження.");
        return;
      }

      setStep("verify");
      setMsg("Код підтвердження надіслано на вашу пошту.");
    } catch (err) {
      console.error(err);
      setError("Помилка сервера. Спробуйте пізніше.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    setError("");
    setMsg("");

    if (!verificationCode.trim()) {
      setError("Введіть код із пошти.");
      return;
    }

    if (!/^\d{6}$/.test(verificationCode.trim())) {
      setError("Код має містити 6 цифр.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/api/auth/verify-registration-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: verificationCode.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Неправильний код підтвердження.");
        return;
      }

      setMsg("Акаунт успішно створено! Зараз переходимо до входу...");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      console.error(err);
      setError("Помилка сервера. Спробуйте пізніше.");
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    setError("");
    setMsg("");

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/api/auth/send-verification-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Не вдалося повторно надіслати код.");
        return;
      }

      setMsg("Новий код підтвердження надіслано на вашу пошту.");
    } catch (err) {
      console.error(err);
      setError("Помилка сервера. Спробуйте пізніше.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        {step === "form" ? (
          <>
            <h2>Створити акаунт</h2>

            <form className="auth-form" onSubmit={handleRegister}>
              <input
                type="text"
                placeholder="Ім’я"
                value={name}
                autoComplete="name"
                onChange={(e) => setName(e.target.value)}
              />

              <input
                type="email"
                placeholder="Електронна пошта"
                value={email}
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
              />

              <div className="password-field">
                <input
                  type="password"
                  placeholder="Пароль"
                  value={password}
                  autoComplete="new-password"
                  onFocus={() => setPasswordTouched(true)}
                  onBlur={() => setPasswordTouched(false)}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  className={showPasswordError ? "input-error" : ""}
                />

                {showPasswordHint && (
                  <div className="password-popover">
                    <p>Ще потрібно:</p>

                    {missingPasswordRules.map((rule) => (
                      <div className="password-rule" key={rule.label}>
                        <span>•</span>
                        {rule.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {password.length > 0 && isPasswordValid && (
                <p className="password-ok">✓ Надійний пароль</p>
              )}

              {error && <p className="error">{error}</p>}
              {msg && <p className="success">{msg}</p>}

              <button type="submit" disabled={loading}>
                {loading ? "Надсилання коду..." : "Зареєструватися"}
              </button>
            </form>

            {!showPasswordHint && (
              <p className="switch-text" onClick={() => navigate("/login")}>
                Вже маєте акаунт? <span>Увійти</span>
              </p>
            )}
          </>
        ) : (
          <>
            <h2>Підтвердження пошти</h2>

            <p className="auth-subtitle">
              Ми надіслали 6-значний код на <strong>{email}</strong>.
              Введіть його нижче, щоб завершити реєстрацію.
            </p>

            <form className="auth-form" onSubmit={handleVerifyCode}>
              <input
                type="text"
                placeholder="6-значний код"
                value={verificationCode}
                inputMode="numeric"
                maxLength={6}
                onChange={(e) =>
                  setVerificationCode(e.target.value.replace(/\D/g, ""))
                }
              />

              {error && <p className="error">{error}</p>}
              {msg && <p className="success">{msg}</p>}

              <button type="submit" disabled={loading}>
                {loading ? "Перевірка..." : "Підтвердити реєстрацію"}
              </button>
            </form>

            <p className="switch-text">
              Не прийшов код? <span onClick={resendCode}>Надіслати ще раз</span>
            </p>

            <p className="switch-text">
              Помилились у пошті?{" "}
              <span
                onClick={() => {
                  setStep("form");
                  setVerificationCode("");
                  setError("");
                  setMsg("");
                }}
              >
                Повернутися назад
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}