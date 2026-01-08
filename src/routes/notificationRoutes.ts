import { authenticate } from "../utils/auth";
import { setNotificationPreference } from "../controllers/notificationController";
import { Router } from "express";
const router = Router();

router.post("/push-notifications", authenticate, setNotificationPreference);

export default router;
