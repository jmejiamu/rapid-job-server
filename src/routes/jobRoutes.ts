import { Router } from "express";
import {
  approveRequestJob,
  completeJob,
  createJob,
  deleteJob,
  getApprovedJobsByOwner,
  getJobs,
  getRequestCount,
  getRequestedJobs,
  getReviewsByJob,
  getReviewsByUser,
  getUserJobs,
  leaveReview,
  rejectRequestJob,
  requestJob,
  updateJob,
} from "../controllers/jobController";
import { authenticate } from "../utils/auth";

const router = Router();

router.get("/retrieve-jobs", getJobs);
router.post("/create-job", authenticate, createJob);
router.get("/my-jobs", authenticate, getUserJobs);
router.delete("/delete-job/:jobId", authenticate, deleteJob);
router.put("/update-job/:jobId", authenticate, updateJob);

router.post("/request-job/:jobId", authenticate, requestJob);
router.post(
  "/approve-request/:jobId/:requestId",
  authenticate,
  approveRequestJob
);
router.post(
  "/reject-request/:jobId/:requestId",
  authenticate,
  rejectRequestJob
);
router.get("/my-requests", authenticate, getRequestedJobs);

router.get("/request-count", authenticate, getRequestCount);

router.post("/complete-job/:jobId", authenticate, completeJob);
router.get("/approved-jobs", authenticate, getApprovedJobsByOwner);

router.post("/review/:jobId", authenticate, leaveReview); // reviewer posts a review for the other participant for this job
router.get("/reviews/:jobId", authenticate, getReviewsByJob); // list reviews for a job
router.get("/user-reviews/:userId", authenticate, getReviewsByUser); // list reviews for a user

export default router;
