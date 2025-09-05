import { Router } from "express";
import {
  approveRequestJob,
  createJob,
  getJobs,
  getRequestedJobs,
  getUserJobs,
  rejectRequestJob,
  requestJob,
} from "../controllers/jobController";
import { authenticate } from "../utils/auth";

const router = Router();

router.get("/retrieve-jobs", getJobs);
router.post("/create-job", authenticate, createJob);
router.get("/my-jobs", authenticate, getUserJobs);

router.post("/request-job/:jobId", authenticate, requestJob);
router.post("/approve-request", authenticate, approveRequestJob);
router.post("/reject-request", authenticate, rejectRequestJob);
router.get("/my-requests", authenticate, getRequestedJobs);

export default router;
