import { Request, Response } from "express";
import Job from "../models/Job";
import { io } from "../index";
import { paginate } from "../utils/pagination";
import JobRequest from "../models/Request";
import Chat, { IChat } from "../models/Chat";
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
  const userId = (req as any).user?.id || (req as any).user?._id;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized: user id missing" });
  }

  try {
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    // Create a new request

    const cannotDoThisJob = await job.userId.equals(userId);
    if (cannotDoThisJob) {
      return res.status(400).json({ error: "You cannot request your own job" });
    }
    // Check if user has already requested the job
    const alreadyRequested = await JobRequest.findOne({ jobId, userId });
    if (alreadyRequested) {
      console.log("You have already requested this job");
      return res
        .status(400)
        .json({ error: "You have already requested this job" });
    }

    const ownerPostId = await job.userId;

    const newRequest = new JobRequest({
      jobId,
      userId: userId,
      status: "pending",
      ownerPostId,
    });
    await newRequest.save();

    io.emit("jobRequested", { jobId, userId }); // Emit event for real-time update

    return res.json({ message: "Job request submitted", request: newRequest });
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

    const request = await JobRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    request.status = "approved";
    await request.save();
    io.emit("requestApproved", { request }); // Emit event for real-time update
    // Send a chat to the requester
    const requesterId = request.userId.toString();
    const newMessage: IChat = new Chat({
      jobId,
      senderId: userId,
      receiverId: requesterId,
      message: `Your request for job ${job.title} has been approved. The address is: ${job.address}`,
      timestamp: new Date(),
    });

    await newMessage.save();
    io.to(requesterId).emit("newMessage", {
      message: `Your request for job ${jobId} has been approved.`,
    });
    res.json({ message: "Request approved", request });
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

    const request = await JobRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    request.status = "rejected";
    await request.save();
    io.emit("requestRejected", { request }); // Emit event for real-time update
    res.json({ message: "Request rejected", request });
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
    const requestedJobs = await JobRequest.find({
      ownerPostId: userId,
      status: "pending",
    })
      .populate("userId", "name email")
      .populate("jobId");

    res.json({ requestedJobs });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

export const getRequestCount = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || (req as any).user?._id;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized: user id missing" });
  }

  try {
    const requestCount = await JobRequest.countDocuments({
      ownerPostId: userId,
      status: "pending",
    });

    res.json({ requestCount });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteJob = async (req: Request, res: Response) => {
  const { jobId } = req.params;
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

    await Job.findByIdAndDelete(jobId);
    io.emit("jobDeleted", job); // Emit event for real-time update
    res.json({ message: "Job deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};
