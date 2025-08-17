import { Router } from "express";

import jobRoutes from "./jobRoutes";
import imageRoutes from "./imageRoutes";

const router = Router();

router.use("/jobs", jobRoutes);
router.use("/image", imageRoutes);

export default router;
