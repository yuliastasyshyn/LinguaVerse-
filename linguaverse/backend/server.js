import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import path from "path";
import jwt from "jsonwebtoken";

import pronunciationRoutes from "./routes/pronunciationRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import progressRoutes from "./routes/progress.js";
import profileRoutes from "./routes/profile.js";
import lessonsRoutes from "./routes/lessonsRoutes.js";
import dictionaryRoutes from "./routes/dictionaryRoutes.js";
import writingRoutes from "./routes/writingRoutes.js";
import challengesRoutes from "./routes/challengesRoutes.js";
import translateRoutes from "./routes/translateRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";


import { register, login } from "./controllers/authController.js";
import {
  getRooms,
  createRoom,
  getRoomById,
  getRoomMessages,
  createMessageHandler,
  createMessageRecord,
  ensureRoomsTable,
  ensureMessagesTable,
} from "./controllers/roomController.js";
import auth from "./middleware/auth.js";
import { chatWithAI } from "./controllers/aiController.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required in .env");
}

const JWT_SECRET = process.env.JWT_SECRET;

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  })
);
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Backend is running" });
});

app.post("/api/register", register);
app.post("/api/login", login);
app.use("/api/auth", authRoutes);

app.post("/api/ai/chat", auth, chatWithAI);
app.use("/api/progress", auth, progressRoutes);
app.use("/api/pronunciation", auth, pronunciationRoutes);
app.use("/api/writing", writingRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/challenges", auth, challengesRoutes);
app.use("/api/translate", translateRoutes);

app.get("/api/rooms", auth, getRooms);
app.get("/api/rooms/:id", auth, getRoomById);
app.get("/api/rooms/:id/messages", auth, getRoomMessages);
app.post("/api/rooms", auth, createRoom);
app.post("/api/rooms/:id/messages", auth, createMessageHandler);

app.use("/api/lessons", auth, lessonsRoutes);
app.use("/api/dictionary", auth, dictionaryRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);

const distPath = path.join(__dirname, "../dist");

app.use(express.static(distPath));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ message: "API route not found" });
  }

  return res.sendFile(path.join(distPath, "index.html"));
});

app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ message: "Internal server error" });
});

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const roomOnlineUsers = new Map();

function getRoomKey(roomId) {
  return `room_${roomId}`;
}

function emitRoomUsers(roomId) {
  const usersMap = roomOnlineUsers.get(String(roomId)) || new Map();
  io.to(getRoomKey(roomId)).emit("room_users", Array.from(usersMap.values()));
}

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Unauthorized socket connection"));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;

    next();
  } catch (error) {
    return next(new Error("Unauthorized socket connection"));
  }
});

io.on("connection", (socket) => {
  socket.on("join_room", ({ roomId }) => {
    if (!roomId) return;

    const normalizedRoomId = String(roomId);
    socket.join(getRoomKey(normalizedRoomId));
    socket.currentRoomId = normalizedRoomId;

    if (!roomOnlineUsers.has(normalizedRoomId)) {
      roomOnlineUsers.set(normalizedRoomId, new Map());
    }

    const userName = socket.user.name || socket.user.email || "User";
    roomOnlineUsers.get(normalizedRoomId).set(String(socket.user.id), {
      id: socket.user.id,
      name: userName,
    });

    emitRoomUsers(normalizedRoomId);
  });

  socket.on("send_message", async ({ roomId, text }) => {
    try {
      if (!roomId || !text || !String(text).trim()) return;

      const savedMessage = await createMessageRecord({
        roomId: Number(roomId),
        userId: socket.user.id,
        userName: socket.user.name || socket.user.email || "User",
        text: String(text).trim(),
      });

      io.to(getRoomKey(roomId)).emit("receive_message", savedMessage);
    } catch (error) {
      console.error("Socket send_message error:", error);
      socket.emit("chat_error", { message: error.message || "Failed to send message" });
    }
  });


     socket.on("join_video_room", ({ roomId }) => {
    if (!roomId) return;

    const videoRoomKey = `video_${roomId}`;
    socket.join(videoRoomKey);
    socket.videoRoomId = String(roomId);

    socket.to(videoRoomKey).emit("video_user_joined", {
      socketId: socket.id,
      userId: socket.user.id,
      name: socket.user.name || socket.user.email || "User",
    });
  });

  socket.on("webrtc_offer", ({ roomId, offer }) => {
    if (!roomId || !offer) return;

    socket.to(`video_${roomId}`).emit("webrtc_offer", {
      offer,
      from: socket.id,
      user: {
        id: socket.user.id,
        name: socket.user.name || socket.user.email || "User",
      },
    });
  });

  socket.on("webrtc_answer", ({ roomId, answer }) => {
    if (!roomId || !answer) return;

    socket.to(`video_${roomId}`).emit("webrtc_answer", {
      answer,
      from: socket.id,
    });
  });

  socket.on("webrtc_ice_candidate", ({ roomId, candidate }) => {
    if (!roomId || !candidate) return;

    socket.to(`video_${roomId}`).emit("webrtc_ice_candidate", {
      candidate,
      from: socket.id,
    });
  });

  socket.on("leave_video_room", ({ roomId }) => {
    if (!roomId) return;

    socket.leave(`video_${roomId}`);
    socket.to(`video_${roomId}`).emit("video_user_left", {
      socketId: socket.id,
    });
  });

  
  socket.on("disconnect", () => {
    const roomId = socket.currentRoomId;
    if (!roomId) return;

    const usersMap = roomOnlineUsers.get(String(roomId));
    if (usersMap) {
      usersMap.delete(String(socket.user.id));
      if (usersMap.size === 0) {
        roomOnlineUsers.delete(String(roomId));
      }
    }

    emitRoomUsers(roomId);
  });
});

const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await ensureRoomsTable();
    await ensureMessagesTable();

    server.listen(PORT, () => {
      console.log(`🔥 Backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
  }
})();
