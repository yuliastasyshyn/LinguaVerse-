import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import "./ChatPage.css";

import { Bot, BookOpen, PencilLine, BookText } from "lucide-react";
import { useTranslation } from "../i18n.jsx";

const API_URL = "http://localhost:4000";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}

function getInitials(name = "User") {
  return (
    String(name)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

function formatTime(dateValue) {
  if (!dateValue) return "";
  return new Date(dateValue).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const currentUser = useMemo(() => getStoredUser(), []);
  const { t, translatePhrase, language } = useTranslation();

  const isRoomMode = Boolean(roomId);

  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(isRoomMode);
  const [error, setError] = useState("");
  const [socketError, setSocketError] = useState("");

  const [videoActive, setVideoActive] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);

  const [aiOpen, setAiOpen] = useState(true);
  const [aiMessages, setAiMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      text: t("Привіт! Я AI-помічник LinguaVerse. Можу пояснити граматику, перекласти фразу, виправити речення або допомогти з навчанням."),
      createdAt: new Date().toISOString(),
    },
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const aiEndRef = useRef(null);

  useEffect(() => {
    setAiMessages((prev) =>
      prev.map((message) =>
        message.id === "welcome"
          ? {
              ...message,
              text: t("Привіт! Я AI-помічник LinguaVerse. Можу пояснити граматику, перекласти фразу, виправити речення або допомогти з навчанням."),
            }
          : message
      )
    );
  }, [language, t]);

  const attachLocalStreamToVideo = useCallback(() => {
    if (!localVideoRef.current || !localStreamRef.current) return;

    localVideoRef.current.srcObject = localStreamRef.current;

    const playPromise = localVideoRef.current.play?.();
    if (playPromise?.catch) {
      playPromise.catch((err) => {
        console.warn("Local video autoplay warning:", err);
      });
    }
  }, []);

  const attachRemoteStreamToVideo = useCallback((stream) => {
    if (!remoteVideoRef.current || !stream) return;

    remoteVideoRef.current.srcObject = stream;

    const playPromise = remoteVideoRef.current.play?.();
    if (playPromise?.catch) {
      playPromise.catch((err) => {
        console.warn("Remote video autoplay warning:", err);
      });
    }
  }, []);

  const createPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit("webrtc_ice_candidate", {
          roomId,
          candidate: event.candidate,
        });
      }
    };

    peer.ontrack = (event) => {
      attachRemoteStreamToVideo(event.streams[0]);
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peer.addTrack(track, localStreamRef.current);
      });
    }

    peerConnectionRef.current = peer;
    return peer;
  }, [attachRemoteStreamToVideo, roomId]);

  const startVideoChat = useCallback(async () => {
    if (!isRoomMode) return;

    try {
      setSocketError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        setSocketError("Браузер не підтримує доступ до камери. Відкрийте сторінку через Chrome або Edge на localhost.");
        return;
      }

      if (!localStreamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        localStreamRef.current = stream;
      }

      setVideoActive(true);
      setMicOn(localStreamRef.current.getAudioTracks().some((track) => track.enabled));
      setCameraOn(localStreamRef.current.getVideoTracks().some((track) => track.enabled));

      setTimeout(() => {
        attachLocalStreamToVideo();
      }, 100);

      socketRef.current?.emit("join_video_room", { roomId });
    } catch (err) {
      console.error("Camera error:", err);

      if (err.name === "NotAllowedError") {
        setSocketError("Доступ до камери або мікрофона заблоковано. Дозвольте Camera/Microphone у браузері.");
      } else if (err.name === "NotFoundError") {
        setSocketError("Камеру або мікрофон не знайдено.");
      } else if (err.name === "NotReadableError") {
        setSocketError("Камера або мікрофон зайняті іншою програмою.");
      } else {
        setSocketError("Не вдалося отримати доступ до камери або мікрофона.");
      }
    }
  }, [attachLocalStreamToVideo, isRoomMode, roomId]);

  const endVideoChat = useCallback(() => {
    socketRef.current?.emit("leave_video_room", { roomId });

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setVideoActive(false);
    setMicOn(true);
    setCameraOn(true);
  }, [roomId]);

  const toggleMic = () => {
    const audioTracks = localStreamRef.current?.getAudioTracks() || [];
    audioTracks.forEach((track) => {
      track.enabled = !track.enabled;
    });

    if (audioTracks.length > 0) {
      setMicOn(audioTracks[0].enabled);
    }
  };

  const toggleCamera = () => {
    const videoTracks = localStreamRef.current?.getVideoTracks() || [];
    videoTracks.forEach((track) => {
      track.enabled = !track.enabled;
    });

    if (videoTracks.length > 0) {
      setCameraOn(videoTracks[0].enabled);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    if (!isRoomMode) {
      setLoading(false);
      setError("");
      return;
    }

    async function loadRoom() {
      try {
        setLoading(true);
        setError("");

        const [roomRes, messagesRes] = await Promise.all([
          fetch(`${API_URL}/api/rooms/${roomId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/rooms/${roomId}/messages`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const roomData = await roomRes.json();
        const messagesData = await messagesRes.json();

        if (!roomRes.ok) {
          throw new Error(roomData?.message || "Не вдалося завантажити кімнату");
        }

        if (!messagesRes.ok) {
          throw new Error(messagesData?.message || "Не вдалося завантажити повідомлення");
        }

        setRoom(roomData);
        setMessages(Array.isArray(messagesData) ? messagesData : []);
      } catch (err) {
        console.error(err);
        setError(err.message || "Помилка завантаження чату");
      } finally {
        setLoading(false);
      }
    }

    loadRoom();
  }, [roomId, token, navigate, isRoomMode]);

  useEffect(() => {
    if (!token || !roomId) return;

    const socket = io(API_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketError("");
      socket.emit("join_room", { roomId });
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
      setSocketError("Не вдалося підключитися до live-чату. Спробуйте перелогінитися.");
    });

    socket.on("receive_message", (message) => {
      setMessages((prev) => {
        if (prev.some((item) => item.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    socket.on("room_users", (users) => {
      setOnlineUsers(Array.isArray(users) ? users : []);
    });

    socket.on("video_user_joined", async () => {
      try {
        if (!localStreamRef.current) return;

        const peer = createPeerConnection();
        const offer = await peer.createOffer();

        await peer.setLocalDescription(offer);

        socket.emit("webrtc_offer", {
          roomId,
          offer,
        });
      } catch (err) {
        console.error("video_user_joined error:", err);
        setSocketError("Помилка створення відеоз'єднання.");
      }
    });

    socket.on("webrtc_offer", async ({ offer }) => {
      try {
        if (!localStreamRef.current) {
          await startVideoChat();
        }

        const peer = createPeerConnection();

        await peer.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        socket.emit("webrtc_answer", {
          roomId,
          answer,
        });
      } catch (err) {
        console.error("webrtc_offer error:", err);
        setSocketError("Помилка прийняття відеодзвінка.");
      }
    });

    socket.on("webrtc_answer", async ({ answer }) => {
      try {
        if (!peerConnectionRef.current) return;

        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
      } catch (err) {
        console.error("webrtc_answer error:", err);
        setSocketError("Помилка підтвердження відеоз'єднання.");
      }
    });

    socket.on("webrtc_ice_candidate", async ({ candidate }) => {
      try {
        if (!peerConnectionRef.current || !candidate) return;

        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } catch (err) {
        console.error("ICE candidate error:", err);
      }
    });

    socket.on("video_user_left", () => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    });

    socket.on("chat_error", (payload) => {
      setSocketError(payload?.message || "Помилка надсилання повідомлення");
    });

    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.off("receive_message");
      socket.off("room_users");
      socket.off("video_user_joined");
      socket.off("webrtc_offer");
      socket.off("webrtc_answer");
      socket.off("webrtc_ice_candidate");
      socket.off("video_user_left");
      socket.off("chat_error");

      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, token, createPeerConnection, startVideoChat]);

  useEffect(() => {
    if (videoActive) {
      attachLocalStreamToVideo();
    }
  }, [videoActive, attachLocalStreamToVideo]);

  useEffect(() => {
    return () => {
      endVideoChat();
    };
  }, [endVideoChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages, aiLoading]);

  const sendRoomMessage = async (e) => {
    e?.preventDefault();

    if (!isRoomMode) return;

    const text = newMessage.trim();
    if (!text) return;

    setNewMessage("");
    setSocketError("");

    if (socketRef.current?.connected) {
      socketRef.current.emit("send_message", { roomId, text });
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/rooms/${roomId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Не вдалося надіслати повідомлення");
      }

      setMessages((prev) => [...prev, data]);
    } catch (err) {
      setSocketError(err.message || "Помилка надсилання повідомлення");
    }
  };

  const askAi = async (questionText) => {
    const text = String(questionText || aiInput).trim();
    if (!text) return;

    const userQuestion = {
      id: `user-${Date.now()}`,
      role: "user",
      text,
      createdAt: new Date().toISOString(),
    };

    setAiMessages((prev) => [...prev, userQuestion]);
    setAiInput("");
    setAiLoading(true);

    try {
      const roomContext = isRoomMode
        ? messages.slice(-8).map((msg) => ({
            user: msg.user_name,
            text: msg.text,
          }))
        : [];

      const res = await fetch(`${API_URL}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          context: roomContext,
          mode: isRoomMode ? "room-assistant" : "general-assistant",
          room: room
            ? {
                title: room.title || room.name,
                language: room.language,
                level: room.level,
                topic: room.topic,
              }
            : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "AI не відповів");
      }

      setAiMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "assistant",
          text: data.reply || data.answer || "Готово. Можу допомогти ще з чимось?",
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setAiMessages((prev) => [
        ...prev,
        {
          id: `ai-error-${Date.now()}`,
          role: "assistant",
          text: `Вибач, сталася помилка: ${err.message}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const explainLastMessage = () => {
    const last = [...messages].reverse().find((msg) => msg.text);

    if (!last) {
      askAi("Поясни мені просте граматичне правило з англійської мови з прикладами.");
      return;
    }

    askAi(`Поясни граматику в цьому реченні та виправ помилки, якщо вони є: "${last.text}"`);
  };

  const translateLastMessage = () => {
    const last = [...messages].reverse().find((msg) => msg.text);

    if (!last) {
      askAi("Переклади фразу українською та поясни її значення.");
      return;
    }

    askAi(`Переклади українською і коротко поясни цю фразу: "${last.text}"`);
  };

  const rephraseDraft = () => {
    const draft = newMessage.trim();

    if (draft) {
      askAi(`Перефразуй це природніше англійською: "${draft}"`);
      return;
    }

    askAi("Запропонуй природну фразу для початку розмови англійською.");
  };

  if (loading) {
    return <div className="chat-loading">Завантаження...</div>;
  }

  if (error && isRoomMode) {
    return (
      <div className="chat-error-page">
        <div className="chat-error-card">
          <h2>Не вдалося відкрити кімнату</h2>
          <p>{error}</p>
          <button onClick={() => navigate("/rooms")}>Повернутися до кімнат</button>
        </div>
      </div>
    );
  }

if (!isRoomMode) {
  return (
    <div className="chat-page">
      <div className="chat-shell ai-only-shell">
        <aside className="room-ai-panel ai-standalone-panel">
          <header className="room-ai-header">
            <div>
              <h2 className="ai-title">
                <span className="ai-title-icon">AI</span>
                AI-Помічник
              </h2>
              <p>Запитайте про граматику, переклад, письмо або вивчення мови</p>
            </div>
          </header>

          <div className="ai-quick-actions">
            <button onClick={() => askAi("Поясни Present Simple простими словами з прикладами.")}>
              <span className="quick-action-icon">G</span>
              <span>Граматика</span>
            </button>

            <button onClick={() => askAi("Допоможи мені скласти коротке речення англійською.")}>
              <span className="quick-action-icon">S</span>
              <span>Скласти речення</span>
            </button>

            <button onClick={() => askAi("Дай мені 10 корисних слів для щоденного спілкування англійською.")}>
              <span className="quick-action-icon">W</span>
              <span>Нові слова</span>
            </button>
          </div>
            <div className="ai-chat-window">
              {aiMessages.map((message) => (
                <div
                  key={message.id}
                  className={`ai-chat-message ${message.role === "user" ? "user" : "assistant"}`}
                >
                  <p>{translatePhrase(message.text)}</p>
                  <span>{formatTime(message.createdAt)}</span>
                </div>
              ))}

              {aiLoading ? (
                <div className="ai-chat-message assistant loading">
                  <p>AI думає...</p>
                </div>
              ) : null}

              <div ref={aiEndRef} />
            </div>

            <form
              className="ai-composer"
              onSubmit={(e) => {
                e.preventDefault();
                askAi();
              }}
            >
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Напишіть запитання AI..."
              />
              <button type="submit" disabled={!aiInput.trim() || aiLoading}>
                ➤
              </button>
            </form>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-shell">
        <section className="room-chat-panel">
          <header className="room-chat-header">
            <button className="leave-btn" onClick={() => navigate("/rooms")}>
              ← Назад
            </button>

            <div className="room-heading">
              <h1>{room?.title || room?.name || "Conversation Room"}</h1>
              <div className="room-meta">
                <span>{room?.level || "A1"}</span>
                <span>{room?.topic || "General"}</span>
                <span>{room?.language || "English"}</span>
                <span>{onlineUsers.length} online</span>
              </div>
            </div>

            <button className="ai-toggle-btn" onClick={() => setAiOpen((prev) => !prev)}>
              {aiOpen ? "Сховати AI" : "Показати AI"}
            </button>
          </header>

          <div className="video-chat-card">
            <div className="video-chat-top">
              <div>
                <h3>🎥 Video practice</h3>
                <p>Спілкуйтесь голосом і відео прямо в кімнаті</p>
              </div>

              {!videoActive ? (
                <button className="video-start-btn" onClick={startVideoChat}>
                  Увійти у відеочат
                </button>
              ) : (
                <button className="video-end-btn" onClick={endVideoChat}>
                  Завершити
                </button>
              )}
            </div>

            {videoActive ? (
              <>
                <div className="video-grid">
                  <div className="video-tile">
                    <video ref={localVideoRef} autoPlay muted playsInline />
                    <span>Ви</span>
                  </div>

                  <div className="video-tile">
                    <video ref={remoteVideoRef} autoPlay playsInline />
                    <span>Співрозмовник</span>
                  </div>
                </div>

                <div className="video-controls">
                  <button type="button" onClick={toggleMic}>
                    {micOn ? "🎙️ Мікрофон увімкнено" : "🔇 Мікрофон вимкнено"}
                  </button>

                  <button type="button" onClick={toggleCamera}>
                    {cameraOn ? "📷 Камера увімкнена" : "🚫 Камера вимкнена"}
                  </button>

                  <button
                    type="button"
                    className="video-fullscreen-btn"
                    onClick={() => window.open(`/video-room/${roomId}`, "_blank", "width=1200,height=800")}
                  >
                    Відкрити повний відеочат
                  </button>
                </div>
              </>
            ) : null}
          </div>

          {socketError ? <div className="socket-alert">{socketError}</div> : null}

          <div className="messages-list" aria-label="Room messages">
            {messages.length === 0 ? (
              <div className="empty-chat-state">
                <h3>Повідомлень ще немає</h3>
                <p>Почніть розмову першою. AI-помічник збоку допоможе сформулювати відповідь.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = Number(msg.user_id) === Number(currentUser?.id);

                return (
                  <article key={msg.id} className={`message-row ${isMine ? "mine" : ""}`}>
                    <div className="message-avatar">{getInitials(msg.user_name)}</div>

                    <div className="message-body">
                      <div className="message-topline">
                        <strong>{isMine ? "Ви" : msg.user_name || "User"}</strong>
                        <span>{formatTime(msg.created_at)}</span>
                      </div>

                      <div className="message-bubble">{msg.text}</div>
                    </div>
                  </article>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>

          <form className="message-composer" onSubmit={sendRoomMessage}>
            <input
              type="text"
              placeholder="Напишіть повідомлення в кімнату..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />

            <button type="button" className="composer-helper-btn" onClick={rephraseDraft}>
              AI
            </button>

            <button type="submit" className="send-room-btn" disabled={!newMessage.trim()}>
              ➤
            </button>
          </form>
        </section>

        {aiOpen ? (
          <aside className="room-ai-panel">
            <header className="room-ai-header">
              <div>
                <h2>🤖 AI-помічник</h2>
                <p>Окреме вікно для граматики, перекладу й підказок</p>
              </div>

              <button onClick={() => setAiOpen(false)} aria-label="Close AI panel">
                ×
              </button>
            </header>

            <div className="ai-quick-actions">
              <button onClick={explainLastMessage}>📘 Пояснити граматику</button>
              <button onClick={translateLastMessage}>🌐 Перекласти останнє</button>
              <button onClick={rephraseDraft}>✨ Перефразувати</button>
            </div>

            <div className="ai-chat-window">
              {aiMessages.map((message) => (
                <div
                  key={message.id}
                  className={`ai-chat-message ${message.role === "user" ? "user" : "assistant"}`}
                >
                  <p>{translatePhrase(message.text)}</p>
                  <span>{formatTime(message.createdAt)}</span>
                </div>
              ))}

              {aiLoading ? (
                <div className="ai-chat-message assistant loading">
                  <p>AI думає...</p>
                </div>
              ) : null}

              <div ref={aiEndRef} />
            </div>

            <form
              className="ai-composer"
              onSubmit={(e) => {
                e.preventDefault();
                askAi();
              }}
            >
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Запитайте AI..."
              />

              <button type="submit" disabled={!aiInput.trim() || aiLoading}>
                ➤
              </button>
            </form>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
