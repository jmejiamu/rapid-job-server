import { Router } from "express";

import jobRoutes from "./jobRoutes";
import imageRoutes from "./imageRoutes";
import authRoutes from "./authRoutes";
import chatRoutes from "./chatRoutes";

const router = Router();

router.use("/jobs", jobRoutes);
router.use("/image", imageRoutes);
router.use("/auth", authRoutes);
router.use("/chat", chatRoutes);

export default router;
