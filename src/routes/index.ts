import { Router } from "express";

import jobRoutes from "./jobRoutes";
import imageRoutes from "./imageRoutes";
import authRoutes from "./authRoutes";

const router = Router();

router.use("/jobs", jobRoutes);
router.use("/images", imageRoutes);
router.use("/auth", authRoutes);

export default router;
