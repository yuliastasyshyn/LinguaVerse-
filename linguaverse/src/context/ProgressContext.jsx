import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:4000/api";
const ProgressContext = createContext(null);

const safeJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

export function ProgressProvider({ children }) {
  const [progress, setProgress] = useState(null);
  const [challengesData, setChallengesData] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  const authHeaders = useMemo(() => {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  const fetchProgress = useCallback(async () => {
    if (!token) return null;

    const res = await fetch(`${API_URL}/progress`, {
      headers: authHeaders,
    });

    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data?.message || "Не вдалося завантажити прогрес");
    }

    setProgress(data);
    return data;
  }, [token, authHeaders]);

  const fetchChallenges = useCallback(async () => {
    if (!token) return null;

    const res = await fetch(`${API_URL}/challenges`, {
      headers: authHeaders,
    });

    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data?.message || "Не вдалося завантажити челенджі");
    }

    setChallengesData(data);
    return data;
  }, [token, authHeaders]);

  const fetchRooms = useCallback(async () => {
    if (!token) return [];

    try {
      const res = await fetch(`${API_URL}/rooms`, {
        headers: authHeaders,
      });
      const data = await safeJson(res);
      if (res.ok && Array.isArray(data)) {
        setRooms(data);
        return data;
      }
    } catch (err) {
      console.error("Rooms fetch failed:", err);
    }

    setRooms([]);
    return [];
  }, [token, authHeaders]);

  const refreshAll = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError("");
      await Promise.all([fetchProgress(), fetchChallenges(), fetchRooms()]);
    } catch (err) {
      console.error(err);
      setError(err.message || "Помилка завантаження даних");
    } finally {
      setLoading(false);
    }
  }, [token, fetchProgress, fetchChallenges, fetchRooms]);

  const updateProgress = useCallback(
    async (payload = {}) => {
      if (!token) return null;

      const res = await fetch(`${API_URL}/progress/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      });

      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(data?.message || "Не вдалося оновити прогрес");
      }

      setProgress(data);
      await fetchChallenges();
      window.dispatchEvent(new CustomEvent("linguaverse:progress-updated", { detail: data }));
      return data;
    },
    [token, authHeaders, fetchChallenges]
  );

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const onFocus = () => refreshAll();
    const onManualRefresh = () => refreshAll();

    window.addEventListener("focus", onFocus);
    window.addEventListener("linguaverse:refresh-progress", onManualRefresh);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("linguaverse:refresh-progress", onManualRefresh);
    };
  }, [refreshAll]);

  const value = useMemo(
    () => ({
      progress,
      challengesData,
      challenges: challengesData?.challenges || [],
      challengeSummary: challengesData?.summary || null,
      rooms,
      loading,
      error,
      refreshAll,
      fetchProgress,
      fetchChallenges,
      updateProgress,
    }),
    [
      progress,
      challengesData,
      rooms,
      loading,
      error,
      refreshAll,
      fetchProgress,
      fetchChallenges,
      updateProgress,
    ]
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error("useProgress must be used inside ProgressProvider");
  }
  return context;
}
