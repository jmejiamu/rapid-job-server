import { Router } from "express";
import jobRoutes from "./jobRoutes";

const router = Router();

router.use("/jobs", jobRoutes);

export default router;
