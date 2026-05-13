import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import "./VideoRoomPage.css";

const API_URL = "http://localhost:4000";

export default function VideoRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [room, setRoom] = useState(null);
  const [videoActive, setVideoActive] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [status, setStatus] = useState("Натисніть кнопку, щоб увійти у відеокімнату");
  const [error, setError] = useState("");

  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);

  const createPeerConnection = () => {
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
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }

      setStatus("Співрозмовник підключений");
    };

    localStreamRef.current?.getTracks().forEach((track) => {
      peer.addTrack(track, localStreamRef.current);
    });

    peerConnectionRef.current = peer;
    return peer;
  };

  const startVideoChat = async () => {
    try {
      setError("");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;
      setVideoActive(true);
      setStatus("Очікуємо співрозмовника...");

      setTimeout(() => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play?.();
        }
      }, 100);

      socketRef.current?.emit("join_video_room", { roomId });
    } catch (err) {
      console.error("Camera error:", err);
      setError("Не вдалося отримати доступ до камери або мікрофона.");
      setStatus("Камера або мікрофон недоступні");
    }
  };

  const endVideoChat = () => {
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
    setStatus("Відеочат завершено");
  };

  const toggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    });
  };

  const toggleCamera = () => {
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setCameraOn(track.enabled);
    });
  };

  const openAsPopup = () => {
    window.open(
      `/video-room/${roomId}`,
      "_blank",
      "width=1200,height=800,left=100,top=80"
    );
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    async function loadRoom() {
      try {
        const res = await fetch(`${API_URL}/api/rooms/${roomId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || "Не вдалося завантажити кімнату");
        }

        setRoom(data);
      } catch (err) {
        setError(err.message || "Помилка завантаження кімнати");
      }
    }

    loadRoom();
  }, [roomId, token, navigate]);

  useEffect(() => {
    if (!token || !roomId) return;

    const socket = io(API_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setError("");
      setStatus("Підключено до відеосервера");
    });

    socket.on("connect_error", (err) => {
      console.error("Socket error:", err.message);
      setError("Не вдалося підключитися до відеосервера.");
    });

    socket.on("video_user_joined", async () => {
      if (!localStreamRef.current) return;

      const peer = createPeerConnection();
      const offer = await peer.createOffer();

      await peer.setLocalDescription(offer);

      socket.emit("webrtc_offer", {
        roomId,
        offer,
      });

      setStatus("Створюємо відеоз’єднання...");
    });

    socket.on("webrtc_offer", async ({ offer }) => {
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

      setStatus("Підключаємося до співрозмовника...");
    });

    socket.on("webrtc_answer", async ({ answer }) => {
      if (!peerConnectionRef.current) return;

      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );

      setStatus("Відеоз’єднання встановлюється...");
    });

    socket.on("webrtc_ice_candidate", async ({ candidate }) => {
      try {
        if (!peerConnectionRef.current) return;

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

      setStatus("Співрозмовник вийшов із відеочату");
    });

    return () => {
      socket.emit("leave_video_room", { roomId });

      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;

      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;

      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, token]);

  useEffect(() => {
    if (videoActive && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play?.();
    }
  }, [videoActive]);

  return (
    <div className="video-room-page">
      <header className="video-room-header">
        <div>
          <button className="video-back-btn" onClick={() => navigate(`/chat/${roomId}`)}>
            ← Назад до чату
          </button>

          <h1>{room?.title || room?.name || "Video Room"}</h1>

          <p>
            {room?.level || "A1"} · {room?.topic || "General"} ·{" "}
            {room?.language || "English"}
          </p>
        </div>

        <div className="video-header-actions">
          <button className="video-popup-btn" onClick={openAsPopup}>
            Відкрити в новому вікні
          </button>

          {videoActive ? (
            <button className="video-danger-btn" onClick={endVideoChat}>
              Завершити
            </button>
          ) : (
            <button className="video-primary-btn" onClick={startVideoChat}>
              Увійти у відеочат
            </button>
          )}
        </div>
      </header>

      {error ? <div className="video-error">{error}</div> : null}

      <main className="video-room-layout">
        <section className="video-main-stage">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="remote-video"
          />

          <div className="remote-placeholder">
            <span>👥</span>
            <h2>Очікуємо співрозмовника</h2>
            <p>{status}</p>
          </div>

          <div className="local-preview">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="local-video"
            />
            <span>Ви</span>
          </div>
        </section>

        <aside className="video-side-panel">
          <h2>🎥 Video practice</h2>
          <p>{status}</p>

          <div className="video-info-card">
            <span>Кімната</span>
            <strong>{room?.title || room?.name || "Conversation Room"}</strong>
          </div>

          <div className="video-info-card">
            <span>Мова</span>
            <strong>{room?.language || "English"}</strong>
          </div>

          <div className="video-info-card">
            <span>Рівень</span>
            <strong>{room?.level || "A1"}</strong>
          </div>

          <div className="video-controls-panel">
            <button
              type="button"
              className={micOn ? "" : "disabled"}
              onClick={toggleMic}
              disabled={!videoActive}
            >
              {micOn ? "🎙️ Мікрофон увімкнено" : "🔇 Мікрофон вимкнено"}
            </button>

            <button
              type="button"
              className={cameraOn ? "" : "disabled"}
              onClick={toggleCamera}
              disabled={!videoActive}
            >
              {cameraOn ? "📷 Камера увімкнена" : "🚫 Камера вимкнена"}
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}