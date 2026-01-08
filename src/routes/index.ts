import { Router } from "express";

import jobRoutes from "./jobRoutes";
import imageRoutes from "./imageRoutes";
import authRoutes from "./authRoutes";
import chatRoutes from "./chatRoutes";
import notificationRoutes from "./notificationRoutes";

const router = Router();

router.use("/jobs", jobRoutes);
router.use("/image", imageRoutes);
router.use("/auth", authRoutes);
router.use("/chat", chatRoutes);
router.use("/notifications", notificationRoutes);

export default router;
