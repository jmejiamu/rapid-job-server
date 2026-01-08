import { authenticate } from "../utils/auth";
import { setNotificationPreference } from "../controllers/notificationController";
import { Router } from "express";
const router = Router();

router.post("/notifications", authenticate, setNotificationPreference);

export default router;
