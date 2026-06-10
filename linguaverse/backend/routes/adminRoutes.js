import express from "express";
import auth from "../middleware/auth.js";
import adminOnly from "../middleware/admin.js";
import {
  getAdminDashboard,
  getAdminUsers,
  getAdminUserById,
  updateAdminUser,
  updateUserRole,
  blockAdminUser,
  unblockAdminUser,
  resetAdminUserPassword,
  deleteAdminUser,
  getAdminLessons,
  createAdminLesson,
  updateAdminLesson,
  deleteAdminLesson,
  getAdminChallenges,
  createAdminChallenge,
  updateAdminChallenge,
  deleteAdminChallenge,
  getAdminRooms,
  updateAdminRoomStatus,
  deleteAdminRoom,
  getAdminReviews,
  updateAdminReview,
  deleteAdminReview,
  getAdminReports,
  createAdminReport,
  updateAdminReport,
  getAdminSettings,
  updateAdminSettings,
  getAdminAiLogs,
} from "../controllers/adminController.js";

const router = express.Router();

router.use(auth);
router.use(adminOnly);

router.get("/dashboard", getAdminDashboard);

router.get("/users", getAdminUsers);
router.get("/users/:id", getAdminUserById);
router.patch("/users/:id", updateAdminUser);
router.patch("/users/:id/role", updateUserRole);
router.patch("/users/:id/block", blockAdminUser);
router.patch("/users/:id/unblock", unblockAdminUser);
router.patch("/users/:id/reset-password", resetAdminUserPassword);
router.delete("/users/:id", deleteAdminUser);

router.get("/lessons", getAdminLessons);
router.post("/lessons", createAdminLesson);
router.patch("/lessons/:id", updateAdminLesson);
router.delete("/lessons/:id", deleteAdminLesson);

router.get("/challenges", getAdminChallenges);
router.post("/challenges", createAdminChallenge);
router.patch("/challenges/:id", updateAdminChallenge);
router.delete("/challenges/:id", deleteAdminChallenge);

router.get("/rooms", getAdminRooms);
router.patch("/rooms/:id/status", updateAdminRoomStatus);
router.delete("/rooms/:id", deleteAdminRoom);

router.get("/reviews", getAdminReviews);
router.patch("/reviews/:id", updateAdminReview);
router.delete("/reviews/:id", deleteAdminReview);

router.get("/reports", getAdminReports);
router.post("/reports", createAdminReport);
router.patch("/reports/:id", updateAdminReport);

router.get("/settings", getAdminSettings);
router.patch("/settings", updateAdminSettings);

router.get("/ai-logs", getAdminAiLogs);

export default router;
