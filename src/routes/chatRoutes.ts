import { Router } from "express";
import {
  getChatHistory,
  sendMessage,
  getUserRooms,
} from "../controllers/chatController";
import { authenticate } from "../utils/auth";

const router = Router();

router.post("/send", authenticate, sendMessage);
router.get("/history/:jobId/:otherUserId", authenticate, getChatHistory);
router.get("/rooms", authenticate, getUserRooms);

export default router;
