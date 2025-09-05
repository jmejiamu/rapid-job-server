import { Request, Response } from "express";
import Job from "../models/Job";
import { io } from "../index";
import { paginate } from "../utils/pagination";
//Home end point
export const getJobs = async (req: Request, res: Response) => {
  try {
    const { title, page = 1, limit = 5 } = req.query;
    const filter: Partial<Record<keyof typeof Job.schema.obj, unknown>> = {};
    if (title) {
      filter.title = { $regex: title, $options: "i" };
    }
    let pageNum = parseInt(page as string, 10);
    let limitNum = parseInt(limit as string, 10);
    if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (isNaN(limitNum) || limitNum < 1) limitNum = 5;

    const { results: jobs, pagination } = await paginate(Job, filter, {
      page: pageNum,
      limit: limitNum,
    });

    res.json({
      jobs,
      pagination,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

export const createJob = async (req: Request, res: Response) => {
  const { title, pay, address, description, images } = req.body;
  const userId = (req as any).user?.id || (req as any).user?._id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized: user id missing" });
  }

  try {
    const newJob = new Job({
      title,
      pay,
      address,
      description,
      images,
      userId: userId,
    });
    await newJob.save();
    io.emit("jobCreated", newJob); // Emit event for real-time update
    res.status(201).json(newJob);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

export const getUserJobs = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || (req as any).user?._id;

  if (!userId) {
    console.error("Unauthorized: user id missing");
    return res.status(401).json({ error: "Unauthorized: user id missing" });
  }

  try {
    const { page = 1, limit = 5 } = req.query;
    let pageNum = parseInt(page as string, 10);
    let limitNum = parseInt(limit as string, 10);
    if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (isNaN(limitNum) || limitNum < 1) limitNum = 5;

    const { results: jobs, pagination } = await paginate(
      Job,
      { userId },
      { page: pageNum, limit: limitNum }
    );

    res.json({
      myJobs: jobs,
      pagination,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

export const requestJob = async (req: Request, res: Response) => {
  const { jobId } = req.params;
  console.log("🚀 ~ requestJob ~ jobId:", jobId);
  const userId = (req as any).user?.id || (req as any).user?._id;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized: user id missing" });
  }

  try {
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Check if user has already requested the job
    const alreadyRequested = job.requests.find(
      (request) => request.userId.toString() === userId.toString()
    );
    if (alreadyRequested) {
      return res
        .status(400)
        .json({ error: "You have already requested this job" });
    }

    job.requests.push({ userId, status: "pending" });
    await job.save();
    io.emit("jobRequested", { jobId, userId }); // Emit event for real-time update
    res.json({ message: "Job request submitted", job });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// Approve a request job

export const approveRequestJob = async (req: Request, res: Response) => {
  const { jobId, requestId } = req.params;
  const userId = (req as any).user?.id || (req as any).user?._id;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized: user id missing" });
  }

  try {
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Check if the current user is the owner of the job
    if (job.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Forbidden: not job owner" });
    }

    const request = job.requests.id(requestId);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    request.status = "approved";
    await job.save();
    io.emit("requestApproved", { jobId, requestId }); // Emit event for real-time update
    res.json({ message: "Request approved", job });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

export const rejectRequestJob = async (req: Request, res: Response) => {
  const { jobId, requestId } = req.params;
  const userId = (req as any).user?.id || (req as any).user?._id;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized: user id missing" });
  }

  try {
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Check if the current user is the owner of the job
    if (job.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Forbidden: not job owner" });
    }

    const request = job.requests.id(requestId);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    request.status = "rejected";
    await job.save();
    io.emit("requestRejected", { jobId, requestId }); // Emit event for real-time update
    res.json({ message: "Request rejected", job });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

export const getRequestedJobs = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || (req as any).user?._id;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized: user id missing" });
  }

  try {
    const jobs = await Job.find({ userId, "requests.0": { $exists: true } }) // Added: Only jobs with at least one request
      .populate("requests.userId", "name email") // Populate requester details
      .populate("userId", "name email");

    res.json({ requestedJobs: jobs });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};
