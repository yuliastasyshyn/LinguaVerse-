import { useTranslation } from "../i18n.jsx";

export default function WelcomeCard({ user }) {
  const { t } = useTranslation();

  return (
    <div className="card wide">
      <h2>
        {t("home.welcome")} {user?.name || t("home.userFallback")} 👋
      </h2>
      <p>{t("home.subtitle")}</p>
    </div>
  );
}
