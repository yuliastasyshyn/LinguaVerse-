import React, { useEffect, useState } from "react";

import { useTranslation } from "../i18n.jsx";
import "./ProfilePage.css";

export default function ProfilePage() {
  
  const { t, language, changeLanguage, languages, languageLabels } = useTranslation();
  const token = localStorage.getItem("token");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [profile, setProfile] = useState({
    user: {
      name: "",
      email: "",
    },
    settings: {
      native_language: "Українська",
      learning_language: "Англійська",
      daily_goal_xp: 50,
      reminders_enabled: true,
      achievements_enabled: true,
      public_profile: false,
      show_stats: true,
    },
    progress: {
      xp: 0,
      words: 0,
      daily_minutes: 0,
      active_days: 0,
    },
    derived: {
      level: "A1",
      badges: 0,
    },
  });

  const [form, setForm] = useState({
    name: "",
    native_language: "Українська",
    learning_language: "Англійська",
    daily_goal_xp: 50,
    reminders_enabled: true,
    achievements_enabled: true,
    public_profile: false,
    show_stats: true,
  });

  async function fetchProfile() {
    try {
      const res = await fetch("http://localhost:4000/api/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data);
        return;
      }

      setProfile(data);
      setForm({
        name: data.user.name || "",
        native_language: data.settings.native_language || "Українська",
        learning_language: data.settings.learning_language || "Англійська",
        daily_goal_xp: data.settings.daily_goal_xp || 50,
        reminders_enabled: data.settings.reminders_enabled,
        achievements_enabled: data.settings.achievements_enabled,
        public_profile: data.settings.public_profile,
        show_stats: data.settings.show_stats,
      });
    } catch (error) {
      console.error("Fetch profile failed:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

const handleSave = async () => {
  try {
    setSaving(true);

    const res = await fetch("http://localhost:4000/api/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: form.name,
        native_language: form.native_language,
        learning_language: form.learning_language,
        daily_goal_xp: Number(form.daily_goal_xp),
        reminders_enabled: form.reminders_enabled,
        achievements_enabled: form.achievements_enabled,
        public_profile: form.public_profile,
        show_stats: form.show_stats,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
  
      alert(data.message || t("profile.saveError"));
      return;
    }

    const savedUser = JSON.parse(localStorage.getItem("user")) || {};
    localStorage.setItem(
      "user",
      JSON.stringify({
        ...savedUser,
        name: form.name,
      })
    );

    await fetchProfile();
    setEditMode(false);
    alert(t("profile.updateSuccess"));

    window.dispatchEvent(new Event("userUpdated"));
  } catch (error) {
    console.error("Save profile failed:", error);
    alert(t("profile.serverError"));
  } finally {
    setSaving(false);
  }
};

  if (loading) {
   
    return <div className="profile-loading">{t("profile.loading")}</div>;
  }

  const firstLetter = profile.user.name?.charAt(0)?.toUpperCase() || "K";

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-title-row">
          <div className="profile-title-icon">👤</div>
          <div>
            {/* Use translated title and subtitle */}
            <h1>{t("profile.title")}</h1>
            <p>{t("profile.subtitle")}</p>
          </div>
        </div>
      </div>

      <section className="profile-hero-card">
        <div className="profile-avatar">{firstLetter}</div>

        <div className="profile-hero-info">
          <h2>{profile.user.name || "Користувач"}</h2>
          <p>{profile.user.email}</p>

          <div className="profile-badges">
            <span className="badge badge-level">Рівень: {profile.derived.level}</span>
            <span className="badge badge-xp">{profile.progress.xp} XP</span>
          </div>
        </div>
      </section>

      <section className="profile-card">
        <div className="profile-card-header">
          <div>
            <h3>⚙ {t("profile.personalInfo")}</h3>
            <p>{t("profile.updatePersonal")}</p>
          </div>

          {!editMode ? (
            <button className="dark-btn" onClick={() => setEditMode(true)}>
              {t("profile.edit")}
            </button>
          ) : (
            <div className="profile-actions">
              <button className="light-btn" onClick={() => setEditMode(false)}>
                {t("profile.cancel")}
              </button>
              <button className="dark-btn" onClick={handleSave} disabled={saving}>
                {saving ? t("profile.saving") : t("profile.save")}
              </button>
            </div>
          )}
        </div>

        <div className="profile-grid">
          <div className="form-group">
            <label>{t("profile.name")}</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              disabled={!editMode}
            />
          </div>

          <div className="form-group">
            <label>{t("profile.email")}</label>
            <input
              type="email"
              value={profile.user.email}
              disabled
            />
          </div>
        </div>
      </section>

      <section className="profile-card">
        <div className="profile-card-header">
          <div>
            <h3>🌐 {t("profile.learningSettings")}</h3>
            <p>{t("profile.learningSettingsSubtitle")}</p>
          </div>
        </div>

        <div className="profile-grid">
          {/* Native language selection */}
          <div className="form-group">
            <label>{t("profile.nativeLanguage")}</label>
            <select
              name="native_language"
              value={form.native_language}
              onChange={handleChange}
              disabled={!editMode}
            >
              <option>Українська</option>
              <option>Англійська</option>
              <option>Іспанська</option>
              <option>Німецька</option>
              <option>Французька</option>
              <option>Італійська</option>
            </select>
          </div>

          {/* Learning language selection */}
          <div className="form-group">
            <label>{t("profile.learningLanguage")}</label>
            <select
              name="learning_language"
              value={form.learning_language}
              onChange={handleChange}
              disabled={!editMode}
            >
              <option>Англійська</option>
              <option>Іспанська</option>
              <option>Німецька</option>
              <option>Французька</option>
              <option>Італійська</option>
              <option>Нідерландська</option>
            </select>
          </div>

          {/* Daily goal selection */}
          <div className="form-group full-width">
            <label>{t("profile.dailyGoal")}</label>
            <select
              name="daily_goal_xp"
              value={form.daily_goal_xp}
              onChange={handleChange}
              disabled={!editMode}
            >
              <option value={30}>30 XP (5 хвилин/день)</option>
              <option value={50}>50 XP (10 хвилин/день)</option>
              <option value={80}>80 XP (15 хвилин/день)</option>
              <option value={100}>100 XP (20 хвилин/день)</option>
            </select>
          </div>

          {/* Interface language switcher. This select controls the UI language for the entire app. */}
          <div className="form-group full-width">
            <label>{t("profile.interfaceLanguage")}</label>
            <select
              value={language}
              onChange={(e) => changeLanguage(e.target.value)}
            >
              {languages.map((lng) => (
                <option key={lng} value={lng}>
                  {languageLabels[lng]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="profile-double-grid">
        <section className="profile-card">
          <div className="profile-card-header">
            <div>
              <h3>🔔 {t("profile.notifications")}</h3>
            </div>
          </div>

          <div className="toggle-list">
            <div className="toggle-row">
              <div>
                <strong>{t("profile.dailyReminders")}</strong>
                <p>{t("profile.dailyRemindersDesc")}</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  name="reminders_enabled"
                  checked={form.reminders_enabled}
                  onChange={handleChange}
                  disabled={!editMode}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="toggle-row">
              <div>
                <strong>{t("profile.achievements")}</strong>
                <p>{t("profile.achievementsDesc")}</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  name="achievements_enabled"
                  checked={form.achievements_enabled}
                  onChange={handleChange}
                  disabled={!editMode}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </section>

        <section className="profile-card">
          <div className="profile-card-header">
            <div>
              <h3>🛡 {t("profile.privacy")}</h3>
            </div>
          </div>

          <div className="toggle-list">
            <div className="toggle-row">
              <div>
                <strong>{t("profile.publicProfile")}</strong>
                <p>{t("profile.publicProfileDesc")}</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  name="public_profile"
                  checked={form.public_profile}
                  onChange={handleChange}
                  disabled={!editMode}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="toggle-row">
              <div>
                <strong>{t("profile.stats")}</strong>
                <p>{t("profile.statsDesc")}</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  name="show_stats"
                  checked={form.show_stats}
                  onChange={handleChange}
                  disabled={!editMode}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </section>
      </div>

      <section className="stats-card">
        <div className="stats-title">◎ {t("profile.overallStats")}</div>

        <div className="stats-grid">
          <div className="stats-item">
            <strong>{profile.progress.xp}</strong>
            <span>{t("profile.totalXP")}</span>
          </div>

          <div className="stats-item">
            <strong>{profile.progress.active_days}</strong>
            <span>{t("profile.activeDays")}</span>
          </div>

          <div className="stats-item">
            <strong>{profile.derived.level}</strong>
            <span>{t("profile.currentLevel")}</span>
          </div>

          <div className="stats-item">
            <strong>{profile.derived.badges}</strong>
            <span>{t("profile.badges")}</span>
          </div>
        </div>
      </section>
    </div>
  );
}