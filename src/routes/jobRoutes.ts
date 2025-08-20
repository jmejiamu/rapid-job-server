import { Router } from "express";
import { createJob, getJobs, getUserJobs } from "../controllers/jobController";
import { authenticate } from "../utils/auth";

const router = Router();

router.get("/retrieve-jobs", getJobs);
router.post("/create-job", authenticate, createJob);
router.get("/my-jobs", authenticate, getUserJobs);

export default router;
