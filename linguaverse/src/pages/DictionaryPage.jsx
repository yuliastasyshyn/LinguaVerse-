import React, { useEffect, useMemo, useState } from "react";
import "./DictionaryPage.css";

const ALL_WORDS_TAB = "all";
const UNGROUPED_TAB = "ungrouped";
const LESSON_WORDS_TAB = "lesson";

export default function DictionaryPage() {
  const [lessonWords, setLessonWords] = useState([]);
  const [customWords, setCustomWords] = useState([]);
  const [collections, setCollections] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [word, setWord] = useState("");
  const [translation, setTranslation] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchDictionary();
  }, []);

  const fetchDictionary = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:4000/api/dictionary", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to load dictionary");

      const data = await response.json();
      setLessonWords(data.lessonWords || []);
      setCustomWords(data.customWords || []);
      setCollections(data.collections || []);
    } catch (err) {
      console.error(err);
      setError("Не вдалося завантажити словник. Спробуйте пізніше.");
    } finally {
      setLoading(false);
    }
  };

  const folders = useMemo(() => {
    const ungroupedCount = customWords.filter((item) => !item.collectionId).length;

    return [
      {
        id: ALL_WORDS_TAB,
        icon: "📚",
        title: "Усі слова",
        subtitle: "Усі власні слова разом",
        count: customWords.length,
        type: "system",
      },
      {
        id: UNGROUPED_TAB,
        icon: "🗂️",
        title: "Без папки",
        subtitle: "Слова без окремої колекції",
        count: ungroupedCount,
        type: "system",
      },
      ...collections.map((collection) => ({
        id: collection.id,
        icon: "⭐",
        title: collection.name,
        subtitle: "Власна колекція",
        count: customWords.filter((item) => String(item.collectionId) === String(collection.id)).length,
        type: "custom",
      })),
      {
        id: LESSON_WORDS_TAB,
        icon: "🎓",
        title: "Слова з уроків",
        subtitle: "Фрази та слова з навчальних уроків",
        count: lessonWords.length,
        type: "lesson",
      },
    ];
  }, [collections, customWords, lessonWords]);

  const filteredWords = useMemo(() => {
    if (activeTab === ALL_WORDS_TAB) return customWords;
    if (activeTab === UNGROUPED_TAB) return customWords.filter((item) => !item.collectionId);
    if (activeTab === LESSON_WORDS_TAB) return [];

    return customWords.filter((item) => String(item.collectionId) === String(activeTab));
  }, [activeTab, customWords]);

  const activeFolder = useMemo(() => {
    return folders.find((folder) => String(folder.id) === String(activeTab));
  }, [activeTab, folders]);

  const selectedCollectionId = useMemo(() => {
    if (!activeTab || activeTab === ALL_WORDS_TAB || activeTab === UNGROUPED_TAB || activeTab === LESSON_WORDS_TAB) {
      return "";
    }

    return activeTab;
  }, [activeTab]);

  useEffect(() => {
    if (selectedCollectionId) {
      setCollectionId(selectedCollectionId);
    }
  }, [selectedCollectionId]);

  const handleAddWord = async (event) => {
    event.preventDefault();
    setError("");

    if (!word.trim() || !translation.trim()) {
      setError("Введіть слово та переклад.");
      return;
    }

    try {
      const response = await fetch("http://localhost:4000/api/dictionary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          word: word.trim(),
          translation: translation.trim(),
          collectionId: collectionId || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || "Failed to save word");
      }

      setWord("");
      setTranslation("");
      await fetchDictionary();
    } catch (err) {
      console.error(err);
      setError(err.message || "Не вдалося додати слово.");
    }
  };

  const handleCreateCollection = async (event) => {
    event.preventDefault();
    setError("");

    if (!collectionName.trim()) {
      setError("Введіть назву папки.");
      return;
    }

    try {
      const response = await fetch("http://localhost:4000/api/dictionary/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: collectionName.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || "Failed to create collection");
      }

      const data = await response.json();
      setCollectionName("");
      setCollections(data.collections || []);
      setActiveTab(data.collection?.id || null);
      setCollectionId(data.collection?.id || "");
    } catch (err) {
      console.error(err);
      setError(err.message || "Не вдалося створити папку.");
    }
  };

  const handleDeleteWord = async (id) => {
    try {
      const response = await fetch(`http://localhost:4000/api/dictionary/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete word");

      const data = await response.json();
      setCustomWords(data.customWords || []);
    } catch (err) {
      console.error(err);
      setError("Не вдалося видалити слово.");
    }
  };

  const handleDeleteCollection = async (id) => {
    try {
      const response = await fetch(`http://localhost:4000/api/dictionary/collections/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete collection");

      const data = await response.json();
      setCollections(data.collections || []);
      setCustomWords(data.customWords || []);
      setActiveTab(null);
      setCollectionId("");
    } catch (err) {
      console.error(err);
      setError("Не вдалося видалити папку.");
    }
  };

  const openFolder = (folderId) => {
    setActiveTab(folderId);
    if (folderId === UNGROUPED_TAB) setCollectionId("");
    if (folderId === ALL_WORDS_TAB || folderId === LESSON_WORDS_TAB) setCollectionId("");
  };

  if (loading) {
    return (
      <div className="dictionary-page">
        <div className="dictionary-loading">Завантаження словника...</div>
      </div>
    );
  }

  return (
    <div className="dictionary-page">
      <section className="dictionary-hero">
        <div>
          <p className="dictionary-eyebrow">Vocabulary space</p>
          <h1>Словникова кімната</h1>
          <p>Спочатку оберіть папку, а вже всередині переглядайте або додавайте слова.</p>
        </div>

        <div className="dictionary-hero-badge">
          <strong>{folders.length}</strong>
          <span>папок</span>
        </div>
      </section>

      {error && <p className="dictionary-error">{error}</p>}

      {!activeTab ? (
        <>
          <section className="folders-toolbar">
            <div>
              <p className="mini-label">Collections</p>
              <h2>Папки словника</h2>
            </div>

            <form className="quick-folder-form" onSubmit={handleCreateCollection}>
              <input
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                placeholder="Нова папка: Фрукти, Дієслова..."
                className="dictionary-input"
              />
              <button type="submit" className="add-collection-btn">
                + Папку
              </button>
            </form>
          </section>

          <section className="folders-grid">
            {folders.map((folder) => (
              <article
                key={folder.id}
                className={`folder-card ${folder.type === "lesson" ? "lesson-folder" : ""}`}
                onClick={() => openFolder(folder.id)}
              >
                <div className="folder-top">
                  <div className="folder-icon">{folder.icon}</div>
                  <div className="folder-count">{folder.count}</div>
                </div>

                <h3>{folder.title}</h3>
                <p>{folder.subtitle}</p>

                <div className="folder-bottom">
                  <button type="button" className="open-folder-btn">
                    Відкрити
                  </button>

                  {folder.type === "custom" && (
                    <button
                      type="button"
                      className="delete-folder-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteCollection(folder.id);
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              </article>
            ))}
          </section>
        </>
      ) : (
        <section className="folder-view">
          <div className="folder-view-header">
            <button className="back-to-folders" onClick={() => setActiveTab(null)}>
              ← До папок
            </button>

            <div>
              <p className="mini-label">Selected folder</p>
              <h2>
                {activeFolder?.icon} {activeFolder?.title}
              </h2>
              <span>{activeFolder?.count || 0} елементів у цій папці</span>
            </div>
          </div>

          {activeTab !== LESSON_WORDS_TAB && (
            <section className="dictionary-actions inside-folder-actions">
              <form className="dictionary-form" onSubmit={handleAddWord}>
                <input
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  placeholder="Слово"
                  className="dictionary-input"
                />

                <input
                  value={translation}
                  onChange={(e) => setTranslation(e.target.value)}
                  placeholder="Переклад"
                  className="dictionary-input"
                />

                <select
                  value={collectionId}
                  onChange={(e) => setCollectionId(e.target.value)}
                  className="dictionary-input dictionary-select"
                >
                  <option value="">Без папки</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>

                <button type="submit" className="dictionary-button">
                  Додати слово
                </button>
              </form>
            </section>
          )}

          {activeTab === LESSON_WORDS_TAB ? (
            <div className="lesson-folder-words">
              {lessonWords.length ? (
                lessonWords.map((item, index) => (
                  <span key={`${item}-${index}`} className="lesson-word-chip">
                    {item}
                  </span>
                ))
              ) : (
                <div className="empty-dictionary">
                  <h3>Уроки поки не містять слів</h3>
                  <p>Коли у ваших уроках з’явиться лексика, вона буде показана тут.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="words-folder-list">
              {filteredWords.length ? (
                filteredWords.map((item) => {
                  const collection = collections.find(
                    (folder) => String(folder.id) === String(item.collectionId)
                  );

                  return (
                    <div key={item.id} className="dictionary-item custom-word">
                      <div className="word-info">
                        <strong>{item.word}</strong>
                        <span>{item.translation}</span>
                        <small>{collection?.name || "Без папки"}</small>
                      </div>

                      <button className="delete-word-btn" onClick={() => handleDeleteWord(item.id)}>
                        Видалити
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="empty-dictionary">
                  <h3>Тут поки немає слів</h3>
                  <p>Додайте слово у цю папку, щоб зібрати свою лексику по темах.</p>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
