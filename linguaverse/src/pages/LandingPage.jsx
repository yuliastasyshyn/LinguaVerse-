import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./LandingPage.css";
import heroEmblem from "../assets/hero-emblem.png";

const features = [
  {
    number: "01",
    title: "AI-помічник",
    text: "Пояснює помилки, допомагає писати речення, тренує діалоги та підказує, як звучати природніше.",
  },
  {
    number: "02",
    title: "Особистий словник",
    text: "Зберігай нові слова, групуй їх за темами та повторюй у зручному темпі.",
  },
  {
    number: "03",
    title: "Розмовні кімнати",
    text: "Практикуй мову з іншими користувачами, а AI-помічник буде поруч, коли потрібна підказка.",
  },
];

const appItems = [
  "розмовні кімнати",
  "словник із власними словами",
  "уроки під твій рівень",
  "прогрес і щоденні цілі",
];

const phraseExamples = [
  "How would you say this in English?",
  "I want to improve my speaking.",
  "Great! Тепер потренуємо природнішу фразу.",
];

const LandingPage = () => {
  const [reviews, setReviews] = useState([]);

  const [reviewForm, setReviewForm] = useState({
    email: "",
    name: "",
    rating: 5,
    text: "",
  });

  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/reviews");
      const data = await res.json();

      if (res.ok) {
        setReviews(data);
      }
    } catch (error) {
      console.error("Reviews load error:", error);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();

    setReviewMessage("");

    if (!reviewForm.email.trim() || !reviewForm.text.trim()) {
      setReviewMessage("Введіть email зареєстрованого акаунта та текст відгуку.");
      return;
    }

    try {
      setReviewLoading(true);

      const res = await fetch("http://localhost:4000/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...reviewForm,
          email: reviewForm.email.trim().toLowerCase(),
          text: reviewForm.text.trim(),
          name: reviewForm.name.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setReviewMessage(data.message || "Не вдалося залишити відгук.");
        return;
      }

      setReviews((prevReviews) => [data, ...prevReviews]);

      setReviewForm({
        email: "",
        name: "",
        rating: 5,
        text: "",
      });

      setReviewMessage("Дякуємо! Ваш відгук успішно додано.");
    } catch (error) {
      console.error("Review create error:", error);
      setReviewMessage("Помилка зʼєднання із сервером.");
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="brand">
          <div className="brand-logo">L</div>
          <span>LinguaVerse.AI</span>
        </div>

        <nav className="landing-nav">
          <a href="#about">Про платформу</a>
          <a href="#features">Можливості</a>
          <a href="#inside">У додатку</a>
          <a href="#reviews">Відгуки</a>
          <a href="#start">Старт</a>
        </nav>

        <div className="header-actions">
          <Link to="/login" className="btn btn-light">
            Увійти
          </Link>
          <Link to="/register" className="btn btn-dark">
            Почати
          </Link>
        </div>
      </header>

      <main>
        <section className="hero-card" id="about">
          <div className="hero-content">
            <p className="eyebrow">AI LANGUAGE LEARNING PLATFORM</p>

            <h1>
              Вивчай мови <br />
              спокійно, <br />
              красиво та <br />
              впевнено
            </h1>

            <p className="hero-text">
              LinguaVerse.AI поєднує уроки, словник, розмовні кімнати та
              AI-помічника, щоб навчання було не хаотичним, а персональним,
              м’яким і зрозумілим.
            </p>

            <div className="hero-buttons">
              <Link to="/register" className="btn-main">
                Створити акаунт
              </Link>
              <Link to="/login" className="btn-secondary">
                Я вже маю акаунт
              </Link>
            </div>
          </div>

          <div className="hero-visual">
            <div className="arch-bg">
              <div className="soft-circle circle-left"></div>
              <div className="soft-circle circle-right"></div>

              <div className="badge badge-today">Today: speaking + writing</div>
              <div className="badge badge-ai">AI</div>
              <div className="badge badge-en">EN</div>
              <div className="badge badge-ua">UA</div>
              <div className="badge badge-words">+12 нових слів</div>

              <div className="emblem image-emblem">
  <img src={heroEmblem} alt="Easy studying of languages" />
</div>
                          </div>
          </div>
        </section>

        <section className="features-section" id="features">
          <div className="section-heading">
            <p className="eyebrow">PLATFORM FEATURES</p>
            <h2>Усе для зручного вивчення мов</h2>
          </div>

          <div className="features-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <span>{feature.number}</span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="inside-app-section" id="inside">
          <div className="inside-app-content">
            <p className="eyebrow">INSIDE THE APP</p>
            <h2>Усе потрібне для практики в одному місці</h2>

            <div className="inside-line"></div>

            <div className="inside-layout">
              <ul className="inside-list">
                {appItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <div className="inside-chat">
                {phraseExamples.map((phrase, index) => (
                  <div className={`chat-row ${index === 2 ? "answer" : ""}`} key={phrase}>
                    {phrase}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="learning-section">
          <div className="learning-card">
            <p className="eyebrow">SMART LEARNING FLOW</p>
            <h2>Навчання, яке підлаштовується під твій темп</h2>
            <p>
              Платформа допомагає поєднати лексику, письмо, вимову,
              спілкування та щоденний прогрес в одному середовищі.
            </p>
          </div>

          <div className="stats-card">
            <div>
              <strong>15 хв</strong>
              <span>щоденна ціль</span>
            </div>
            <div>
              <strong>4+</strong>
              <span>формати практики</span>
            </div>
            <div>
              <strong>AI</strong>
              <span>пояснення помилок</span>
            </div>
          </div>
        </section>

        <section className="reviews-section" id="reviews">
          <div className="section-heading centered">
            <p className="eyebrow">USER REVIEWS</p>
            <h2>Відгуки користувачів</h2>
            <p className="reviews-subtitle">
              Залишити відгук можуть лише зареєстровані користувачі.
              Для перевірки введіть електронну адресу, з якою створено акаунт.
            </p>
          </div>

          <form className="review-form" onSubmit={handleReviewSubmit}>
            <label>Електронна адреса</label>
            <input
              type="email"
              placeholder="your.email@example.com"
              value={reviewForm.email}
              onChange={(e) =>
                setReviewForm({ ...reviewForm, email: e.target.value })
              }
            />

            <label>Ім'я (необов'язково)</label>
            <input
              type="text"
              placeholder="Як вас звати?"
              value={reviewForm.name}
              onChange={(e) =>
                setReviewForm({ ...reviewForm, name: e.target.value })
              }
            />

            <small>
              Ми перевіряємо, чи існує користувач із такою електронною адресою.
            </small>

            <label>Оцінка</label>
            <select
              value={reviewForm.rating}
              onChange={(e) =>
                setReviewForm({
                  ...reviewForm,
                  rating: Number(e.target.value),
                })
              }
            >
              <option value={5}>★★★★★ 5</option>
              <option value={4}>★★★★ 4</option>
              <option value={3}>★★★ 3</option>
              <option value={2}>★★ 2</option>
              <option value={1}>★ 1</option>
            </select>

            <label>Ваш відгук</label>
            <textarea
              placeholder="Напишіть свій відгук..."
              value={reviewForm.text}
              onChange={(e) =>
                setReviewForm({ ...reviewForm, text: e.target.value })
              }
            />

            <button type="submit" disabled={reviewLoading}>
              {reviewLoading ? "Надсилання..." : "Надіслати відгук"}
            </button>

            {reviewMessage && (
              <p className="review-message">{reviewMessage}</p>
            )}
          </form>

          {reviews.length === 0 ? (
            <div className="empty-reviews">
              <div className="empty-icon">❝</div>
              <h3>Тут поки немає відгуків</h3>
              <p>Будьте першим, хто залишить відгук!</p>
            </div>
          ) : (
            <div className="reviews-grid">
              {reviews.map((review) => (
                <article className="review-card" key={review.id}>
                  <div className="quote-mark">“</div>

                  <div className="review-rating">
                    {"★".repeat(review.rating)}
                    {"☆".repeat(5 - review.rating)}
                  </div>

                  <p>{review.text}</p>

                  <div className="review-author">
                    <div className="avatar">
                      {review.name
                        ? review.name.charAt(0).toUpperCase()
                        : review.email.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <h4>{review.name || review.email}</h4>
                      <span>користувач платформи</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="start-section" id="start">
          <div>
            <p className="eyebrow">START TODAY</p>
            <h2>Почни вивчати мови у власному темпі</h2>
            <p>
              Створи акаунт, обери ціль навчання і поступово формуй власну
              мовну практику разом із LinguaVerse.AI.
            </p>
          </div>

          <Link to="/register" className="btn-main">
            Розпочати навчання
          </Link>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;