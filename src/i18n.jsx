import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import uk from "./locales/uk.json";
import en from "./locales/en.json";
import it from "./locales/it.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import es from "./locales/es.json";
import pl from "./locales/pl.json";

const translations = {
  uk,
  en,
  it,
  fr,
  de,
  es,
  pl,
};

export const supportedLanguages = ["uk", "en", "it", "fr", "de", "es", "pl"];

export const languageLabels = {
  uk: "Українська",
  en: "English",
  it: "Italiano",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  pl: "Polski",
};

export const languageOptions = supportedLanguages.map((code) => ({
  code,
  label: languageLabels[code],
}));

const LANGUAGE_STORAGE_KEYS = [
  "interfaceLanguage",
  "selectedInterfaceLanguage",
  "linguaverse_language",
  "appLanguage",
  "selectedLanguage",
  "language",
  "i18nextLng",
];

const languageAliases = {
  uk: "uk",
  ua: "uk",
  ukrainian: "uk",
  ukrainien: "uk",
  ukrainisch: "uk",
  ucraino: "uk",
  ucraniano: "uk",
  ukrainski: "uk",
  українська: "uk",
  "українська мова": "uk",
  украинский: "uk",

  en: "en",
  eng: "en",
  english: "en",
  anglais: "en",
  englisch: "en",
  inglese: "en",
  ingles: "en",
  англійська: "en",
  английский: "en",

  it: "it",
  italian: "it",
  italiano: "it",
  italien: "it",
  italienisch: "it",
  włoski: "it",
  wloski: "it",
  італійська: "it",
  итальянский: "it",

  fr: "fr",
  fre: "fr",
  french: "fr",
  francais: "fr",
  français: "fr",
  franCais: "fr",
  französisch: "fr",
  francese: "fr",
  frances: "fr",
  francuski: "fr",
  французька: "fr",
  французский: "fr",

  de: "de",
  ger: "de",
  german: "de",
  deutsch: "de",
  allemand: "de",
  tedesco: "de",
  aleman: "de",
  niemiecki: "de",
  німецька: "de",
  немецкий: "de",

  es: "es",
  spa: "es",
  spanish: "es",
  español: "es",
  espanol: "es",
  espagnol: "es",
  spanisch: "es",
  spagnolo: "es",
  hiszpanski: "es",
  іспанська: "es",
  испанский: "es",

  pl: "pl",
  pol: "pl",
  polish: "pl",
  polski: "pl",
  polonais: "pl",
  polnisch: "pl",
  polacco: "pl",
  polaco: "pl",
  польська: "pl",
  польский: "pl",
};

const navKeys = [
  "home",
  "lessons",
  "ai",
  "aiAssistant",
  "aiChat",
  "pronunciation",
  "writing",
  "dictionary",
  "translator",
  "rooms",
  "challenges",
  "progress",
  "profile",
  "admin",
  "adminPanel",
  "logout",
  "login",
];

const navExtraVariants = {
  home: ["Головна", "Home", "Strona główna"],
  lessons: ["Уроки", "Lessons", "Lezioni", "Leçons", "Lektionen", "Lecciones", "Lekcje"],
  ai: ["AI-Помічник", "AI-помічник", "AI Assistant", "Assistente IA", "Assistant IA", "KI-Assistent", "Asistente de IA", "Asystent AI"],
  aiAssistant: ["AI-Помічник", "AI-помічник", "AI Assistant", "Assistente IA", "Assistant IA", "KI-Assistent", "Asistente de IA", "Asystent AI"],
  aiChat: ["AI-чат", "AI Chat", "Chat IA", "KI-Chat", "Chat de IA", "Czat AI"],
  pronunciation: ["Вимова", "Pronunciation", "Pronuncia", "Prononciation", "Aussprache", "Pronunciación", "Wymowa"],
  writing: ["Письмо", "Writing", "Scrittura", "Écriture", "Ecriture", "Schreiben", "Escritura", "Pisanie"],
  dictionary: ["Словник", "Dictionary", "Dizionario", "Dictionnaire", "Wörterbuch", "Worterbuch", "Diccionario", "Słownik", "Slownik"],
  translator: ["Перекладач", "Translator", "Traduttore", "Traducteur", "Übersetzer", "Ubersetzer", "Traductor", "Tłumacz", "Tlumacz"],
  rooms: ["Кімнати", "Rooms", "Stanze", "Salons", "Salles", "Räume", "Raume", "Salas", "Pokoje"],
  challenges: ["Челенджі", "Завдання", "Challenges", "Sfide", "Défis", "Defis", "Herausforderungen", "Retos", "Desafíos", "Desafios", "Wyzwania"],
  progress: ["Прогрес", "Progress", "Progresso", "Progrès", "Progres", "Fortschritt", "Progreso", "Postęp", "Postep"],
  profile: ["Профіль", "Profile", "Profilo", "Profil", "Perfil"],
  admin: ["Адмінка", "Панель адміністратора", "Admin", "Admin Panel", "Pannello di amministrazione", "Panneau d’administration", "Administrationsbereich", "Panel de administración", "Panel administracyjny"],
  adminPanel: ["Адмінка", "Панель адміністратора", "Admin", "Admin Panel", "Pannello di amministrazione", "Panneau d’administration", "Administrationsbereich", "Panel de administración", "Panel administracyjny"],
  logout: ["Вийти", "Log out", "Logout", "Esci", "Se déconnecter", "Abmelden", "Salir", "Wyloguj"],
  login: ["Увійти", "Log in", "Login", "Accedi", "Se connecter", "Einloggen", "Iniciar sesión", "Zaloguj się"],
};

const interfaceLanguageLabelVariants = [
  "Мова інтерфейсу",
  "Interface language",
  "Lingua dell’interfaccia",
  "Lingua dell'interfaccia",
  "Langue de l’interface",
  "Langue de l'interface",
  "Sprache der Benutzeroberfläche",
  "Interface-Sprache",
  "Idioma de la interfaz",
  "Język interfejsu",
];

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeLookupKey(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeLanguageValue(value) {
  return normalizeLookupKey(String(value ?? "").replace(/^['"]|['"]$/g, ""));
}

export function resolveLanguageCode(value) {
  if (!value) return null;

  const raw = String(value).trim();
  if (supportedLanguages.includes(raw)) return raw;

  const normalized = normalizeLanguageValue(raw);
  return languageAliases[normalized] || null;
}

function readStoredLanguage() {
  if (typeof localStorage === "undefined") return "uk";

  for (const key of LANGUAGE_STORAGE_KEYS) {
    const code = resolveLanguageCode(localStorage.getItem(key));
    if (code) return code;
  }

  return "uk";
}

function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;

  return String(path)
    .split(".")
    .reduce((acc, part) => {
      return acc && Object.prototype.hasOwnProperty.call(acc, part)
        ? acc[part]
        : undefined;
    }, obj);
}

function interpolate(value, variables = {}) {
  if (typeof value !== "string") return value;

  return value.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return variables[key] !== undefined ? String(variables[key]) : "";
  });
}

function setPhraseMapValue(map, source, target, force = false) {
  const sourceText = normalizeText(source);
  const targetText = normalizeText(target);
  if (!sourceText || !targetText) return;

  const keys = new Set([sourceText, normalizeLookupKey(sourceText)]);

  keys.forEach((key) => {
    if (!key) return;

    const existing = map.get(key);
    const existingLooksIdentity = existing && normalizeLookupKey(existing) === key;

    if (force || !existing || existingLooksIdentity) {
      map.set(key, targetText);
    }
  });
}

function getNavTarget(language, key) {
  const nav = translations[language]?.nav || translations.uk?.nav || {};

  if (key === "adminPanel") return nav.adminPanel || nav.admin;
  if (key === "ai") return nav.ai || nav.aiAssistant;
  return nav[key];
}

function addNavigationTranslations(map, targetLanguage) {
  navKeys.forEach((key) => {
    const target = getNavTarget(targetLanguage, key);
    if (!target) return;

    const variants = new Set(navExtraVariants[key] || []);

    supportedLanguages.forEach((code) => {
      const value = translations[code]?.nav?.[key];
      if (value) variants.add(value);

      const autoByUkrainianKey = translations[code]?.auto?.[translations.uk?.nav?.[key]];
      if (autoByUkrainianKey) variants.add(autoByUkrainianKey);
    });

    variants.forEach((variant) => setPhraseMapValue(map, variant, target, true));
  });
}

function buildPhraseTranslator(language) {
  const targetLanguage = supportedLanguages.includes(language) ? language : "uk";
  const directMap = new Map();
  const ukrainianAuto = translations.uk?.auto || {};

  Object.keys(ukrainianAuto).forEach((sourcePhrase) => {
    const targetPhrase =
      translations[targetLanguage]?.auto?.[sourcePhrase] ||
      translations.uk?.auto?.[sourcePhrase] ||
      sourcePhrase;

    const variants = new Set([sourcePhrase]);

    supportedLanguages.forEach((code) => {
      const phrase = translations[code]?.auto?.[sourcePhrase];
      if (phrase) variants.add(phrase);
    });

    variants.forEach((variant) => setPhraseMapValue(directMap, variant, targetPhrase, false));
  });

  // This is the important part for the left navbar: it forcefully maps labels
  // from ANY previous language into the currently selected language.
  addNavigationTranslations(directMap, targetLanguage);

  const fragmentMap = translations[targetLanguage]?.fragments || {};
  const fragmentEntries = Object.entries(fragmentMap)
    .filter(([source, target]) => source && target && source !== target)
    .sort((a, b) => b[0].length - a[0].length);

  return function translatePhrase(value) {
    if (value === null || value === undefined) return value;

    const original = String(value);
    const normalized = normalizeText(original);

    if (!normalized) return original;

    const leading = original.match(/^\s*/)?.[0] || "";
    const trailing = original.match(/\s*$/)?.[0] || "";
    const target = directMap.get(normalized) || directMap.get(normalizeLookupKey(normalized));

    if (target) {
      return `${leading}${target}${trailing}`;
    }

    let translated = normalized;

    fragmentEntries.forEach(([source, targetValue]) => {
      const safeSource = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      translated = translated.replace(new RegExp(safeSource, "g"), targetValue);
    });

    return `${leading}${translated}${trailing}`;
  };
}

function shouldSkipTextNode(node) {
  const parent = node?.parentElement;
  if (!parent) return true;

  const skippedTags = [
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "CODE",
    "PRE",
    "TEXTAREA",
    "OPTION",
  ];

  return skippedTags.includes(parent.tagName);
}

function translateDom(root, translatePhrase, originalTextByNode) {
  if (typeof document === "undefined" || !root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (shouldSkipTextNode(node)) return NodeFilter.FILTER_REJECT;
      return normalizeText(node.nodeValue)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  textNodes.forEach((node) => {
    const currentText = normalizeText(node.nodeValue);

    if (!originalTextByNode.current.has(node)) {
      originalTextByNode.current.set(node, node.nodeValue);
    }

    const storedOriginal = originalTextByNode.current.get(node);
    const translatedFromOriginal = translatePhrase(storedOriginal);
    const translatedFromCurrent = translatePhrase(node.nodeValue);
    const translated =
      translatedFromCurrent !== node.nodeValue ? translatedFromCurrent : translatedFromOriginal;

    if (translated !== node.nodeValue && normalizeText(translated) !== currentText) {
      node.nodeValue = translated;
    }
  });

  root.querySelectorAll?.("[placeholder], [title], [aria-label]").forEach((element) => {
    ["placeholder", "title", "aria-label"].forEach((attr) => {
      const currentValue = element.getAttribute(attr);
      if (!currentValue) return;

      const dataAttr = `data-i18n-original-${attr}`;
      const storedOriginal = element.getAttribute(dataAttr);

      if (!storedOriginal) {
        element.setAttribute(dataAttr, currentValue);
      }

      const original = storedOriginal || currentValue;
      const translatedFromOriginal = translatePhrase(original);
      const translatedFromCurrent = translatePhrase(currentValue);
      const translated =
        translatedFromCurrent !== currentValue ? translatedFromCurrent : translatedFromOriginal;

      if (translated !== currentValue) {
        element.setAttribute(attr, translated);
      }
    });
  });
}

function useRuntimeUiTranslation(language) {
  const originalTextByNode = useRef(new WeakMap());
  const translatePhrase = useMemo(() => buildPhraseTranslator(language), [language]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    let frameId = null;

    const run = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        translateDom(document.body, translatePhrase, originalTextByNode);
      });
    };

    run();

    const observer = new MutationObserver(run);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "title", "aria-label"],
    });

    const intervalId = window.setInterval(run, 250);
    window.addEventListener("popstate", run);
    window.addEventListener("hashchange", run);

    return () => {
      observer.disconnect();
      window.clearInterval(intervalId);
      window.removeEventListener("popstate", run);
      window.removeEventListener("hashchange", run);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [translatePhrase]);
}

function looksLikeInterfaceLanguageSelect(select) {
  if (!select || select.tagName !== "SELECT") return false;

  const meta = [
    select.name,
    select.id,
    select.getAttribute("aria-label"),
    select.getAttribute("data-field"),
    select.getAttribute("data-name"),
    select.getAttribute("data-i18n"),
  ]
    .filter(Boolean)
    .join(" ");

  if (/interface|інтерфейс|interfaz|interfejs|oberfläche|interfaccia/i.test(meta)) {
    return true;
  }

  const nearby = [
    select.previousElementSibling?.textContent,
    select.parentElement?.querySelector("label")?.textContent,
    select.parentElement?.previousElementSibling?.textContent,
  ]
    .filter(Boolean)
    .join(" ");

  const normalizedNearby = normalizeLookupKey(nearby);

  return interfaceLanguageLabelVariants.some((label) =>
    normalizedNearby.includes(normalizeLookupKey(label))
  );
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      return readStoredLanguage();
    } catch (error) {
      return "uk";
    }
  });

  const setLanguage = (value) => {
    const resolvedCode = resolveLanguageCode(value);

    if (resolvedCode) {
      setLanguageState(resolvedCode);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("linguaverse:language-change", {
            detail: { key: "interfaceLanguage", value: resolvedCode },
          })
        );
      }
    }
  };

  useEffect(() => {
    try {
      LANGUAGE_STORAGE_KEYS.forEach((key) => localStorage.setItem(key, language));
      document.documentElement.lang = language;
    } catch (error) {
      // Ignore storage errors in private browsing modes.
    }
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncFromStorageValue = (value) => {
      const code = resolveLanguageCode(value);
      if (code) {
        setLanguageState((current) => (current === code ? current : code));
      }
    };

    const handleStorage = (event) => {
      if (!event.key || LANGUAGE_STORAGE_KEYS.includes(event.key)) {
        syncFromStorageValue(event.newValue || readStoredLanguage());
      }
    };

    const handleLanguageEvent = (event) => {
      const key = event?.detail?.key;
      if (key && !LANGUAGE_STORAGE_KEYS.includes(key)) return;
      syncFromStorageValue(event?.detail?.value || readStoredLanguage());
    };

    const handleSelectChange = (event) => {
      const select = event.target;
      if (!looksLikeInterfaceLanguageSelect(select)) return;

      const selectedText = select.selectedOptions?.[0]?.textContent;
      const code = resolveLanguageCode(select.value) || resolveLanguageCode(selectedText);
      if (code) setLanguageState((current) => (current === code ? current : code));
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("linguaverse:language-change", handleLanguageEvent);
    window.addEventListener("app-language-change", handleLanguageEvent);
    document.addEventListener("change", handleSelectChange, true);

    const intervalId = window.setInterval(() => {
      syncFromStorageValue(readStoredLanguage());
    }, 300);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("linguaverse:language-change", handleLanguageEvent);
      window.removeEventListener("app-language-change", handleLanguageEvent);
      document.removeEventListener("change", handleSelectChange, true);
      window.clearInterval(intervalId);
    };
  }, []);

  useRuntimeUiTranslation(language);

  const translatePhrase = useMemo(() => buildPhraseTranslator(language), [language]);

  const t = (key, variables = {}) => {
    const currentValue = getNestedValue(translations[language], key);
    const ukrainianValue = getNestedValue(translations.uk, key);
    const value = currentValue ?? ukrainianValue;

    if (value !== undefined) {
      return interpolate(value, variables);
    }

    return interpolate(translatePhrase(key), variables);
  };

  const value = useMemo(
    () => ({
      language,
      currentLanguage: language,
      setLanguage,
      changeLanguage: setLanguage,
      t,
      translate: t,
      translatePhrase,
      languages: supportedLanguages,
      supportedLanguages,
      languageLabels,
      languageOptions,
    }),
    [language, translatePhrase]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useTranslation must be used inside I18nProvider");
  }

  return context;
}

export function useI18n() {
  return useTranslation();
}

export default I18nProvider;
