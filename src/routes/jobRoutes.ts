import { Router } from "express";
// import { getJobs } from "../controllers/jobController";
import { getJobs } from "../controllers/jobController";

const router = Router();

router.get("/", getJobs);

export default router;
