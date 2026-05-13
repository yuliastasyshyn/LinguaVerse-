import React from "react";
import { Link } from "react-router-dom";
import "./LandingPage.css";

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

const testimonials = [
  {
    name: "Анна",
    role: "вивчає англійську",
    text: "Мені подобається, що тут усе не хаотично: є уроки, словник, прогрес і AI-пояснення. Стало легше займатися регулярно.",
  },
  {
    name: "Марко",
    role: "практикує speaking",
    text: "Розмовні кімнати дуже допомагають. Можна писати з іншими, а якщо не знаєш слово — одразу питати AI.",
  },
  {
    name: "Юлія",
    role: "готується до навчання",
    text: "Дизайн спокійний і не перевантажений. Хочеться заходити щодня й бачити свій прогрес.",
  },
];

const LandingPage = () => {
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

              <div className="emblem">
                <div className="emblem-ring">
                  <div className="emblem-title">EASY STUDYING</div>

                  <svg viewBox="0 0 260 260" className="emblem-svg" aria-label="Easy studying of languages emblem">
                    <circle cx="130" cy="130" r="118" fill="#fbf7ee" stroke="#004d4d" strokeWidth="8" />
                    <circle cx="130" cy="130" r="98" fill="none" stroke="#0b6763" strokeWidth="3" />

                    <path
                      d="M78 157 C95 145,112 145,130 162 C148 145,165 145,182 157 L182 185 C165 174,147 176,130 191 C113 176,95 174,78 185 Z"
                      fill="#f6efe2"
                      stroke="#004d4d"
                      strokeWidth="5"
                    />

                    <path d="M130 162 L130 191" stroke="#004d4d" strokeWidth="4" />
                    <path d="M87 165 C101 158,115 159,126 169" stroke="#004d4d" strokeWidth="2" fill="none" />
                    <path d="M174 165 C159 158,145 159,134 169" stroke="#004d4d" strokeWidth="2" fill="none" />

                    <path d="M85 142 L112 78" stroke="#004d4d" strokeWidth="6" strokeLinecap="round" />
                    <path
                      d="M93 119 C102 103,111 91,124 78 C119 98,109 115,93 119Z"
                      fill="#a6c4b4"
                      stroke="#004d4d"
                      strokeWidth="3"
                    />

                    <circle cx="173" cy="91" r="28" fill="#dcebe5" stroke="#004d4d" strokeWidth="4" />
                    <path
                      d="M145 91 H201 M173 63 V119 M154 73 C168 82,178 82,192 73 M154 109 C168 100,178 100,192 109"
                      stroke="#004d4d"
                      strokeWidth="3"
                      fill="none"
                    />

                    <path d="M160 145 C179 132,194 113,205 88" stroke="#004d4d" strokeWidth="5" fill="none" strokeLinecap="round" />
                    <path d="M205 88 L207 108 L190 96" fill="#004d4d" />

                    <rect x="161" y="153" width="14" height="35" fill="#0b6763" rx="2" />
                    <rect x="181" y="137" width="14" height="51" fill="#6f9f8f" rx="2" />
                    <rect x="201" y="118" width="14" height="70" fill="#a6c4b4" rx="2" />

                    <text x="130" y="226" textAnchor="middle" fontSize="24" fontWeight="700" fill="#004d4d">
                      OF LANGUAGES
                    </text>
                  </svg>
                </div>
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
              Платформа допомагає поєднати лексику, письмо, вимову, спілкування
              та щоденний прогрес в одному середовищі. Так користувач бачить не
              просто окремі завдання, а повну картину свого розвитку.
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
          </div>

          <div className="reviews-grid">
            {testimonials.map((review) => (
              <article className="review-card" key={review.name}>
                <div className="quote-mark">“</div>
                <p>{review.text}</p>
                <div className="review-author">
                  <div className="avatar">{review.name.charAt(0)}</div>
                  <div>
                    <h4>{review.name}</h4>
                    <span>{review.role}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
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
