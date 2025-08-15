import { Router } from "express";
import { createJob, getJobs } from "../controllers/jobController";

const router = Router();

router.get("/retrieve-jobs", getJobs);
router.post("/create-job", createJob);

export default router;
