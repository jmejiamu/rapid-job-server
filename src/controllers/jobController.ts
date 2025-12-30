import { Request, Response } from "express";
import Job from "../models/Job";
import { io } from "../index";
import { paginate } from "../utils/pagination";
import JobRequest from "../models/Request";
import Chat, { IChat } from "../models/Chat";
import Review from "../models/Review";
import { sendNotification } from "../services/notification";
import User from "../models/User";
//Home end point
export const getJobs = async (req: Request, res: Response) => {
  try {
    const { title, category, status = "open", page = 1, limit = 5 } = req.query;

    const filter: Partial<Record<keyof typeof Job.schema.obj, unknown>> = {};
    if (title) {
      filter.title = { $regex: title, $options: "i" };
    }
    if (category) {
      filter.category = category;
    }
    if (status) {
      filter.status = status;
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
  const { title, pay, address, description, images, category } = req.body;
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
      category,
    });
    await newJob.save();
    const users = await User.find({ _id: { $ne: userId } });
    const deviceTokens = Array.from(
      new Set(users.map((u) => u.deviceToken).filter(Boolean) as string[])
    );

    sendNotification({
      deviceTokens: deviceTokens, // Fetch device tokens of users to notify
      message: `${title}`,
      title: "New Job Available",
      data: { jobId: newJob._id },
    });

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

    const [reviewsCount, jobsDone] = await Promise.all([
      Review.countDocuments({ revieweeId: userId }), // or reviewerId if you want reviews given
      Job.find({ assignedTo: userId, status: "completed" }).populate(
        "userId",
        "name"
      ),
    ]);

    res.json({
      myJobs: jobs,
      pagination,
      counts: {
        reviews: reviewsCount,
        jobsDone: jobsDone.length,
      },
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

    const owner = await User.findById(job.userId);
    const requesterUser = await User.findById(userId);
    const ownerDeviceTokens = [owner?.deviceToken].filter(Boolean) as string[];

    if (ownerDeviceTokens.length > 0) {
      sendNotification({
        deviceTokens: ownerDeviceTokens,
        message: `${requesterUser?.name ?? "Someone"} requested your job "${
          job.title
        }"`,
        title: "Job Requested",
        data: { jobId, requestId: newRequest._id },
      });
    }

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

    job.assignedTo = request.userId;
    job.status = "approved";
    await job.save();

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

    const requestUser = await User.findById(requesterId);

    await newMessage.save();
    io.to(requesterId).emit("newMessage", {
      message: `Your request for job ${jobId} has been approved.`,
    });
    sendNotification({
      deviceTokens: [requestUser?.deviceToken].filter(Boolean) as string[], // Assuming requesterId is the device token
      message: `Your request for job ${job.title} has been approved.`,
      title: "Job Request Approved",
      data: { jobId },
    });
    res.json({ message: "Request approved", request });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

export const getApprovedJobsByOwner = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || (req as any).user?._id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { page = 1, limit = 5 } = req.query;
    let pageNum = parseInt(page as string, 10);
    let limitNum = parseInt(limit as string, 10);
    if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (isNaN(limitNum) || limitNum < 1) limitNum = 5;

    const filter: any = {
      $or: [{ userId }, { assignedTo: userId }],
      status: { $in: ["approved", "completed"] },
    };

    const { results: jobs, pagination } = await paginate(Job, filter, {
      page: pageNum,
      limit: limitNum,
    });

    // Populate owner and assignee so we can send their names
    const populatedJobs = await Job.populate(jobs, [
      { path: "userId", select: "name" },
      { path: "assignedTo", select: "name" },
    ]);

    const mappedJobs = await Promise.all(
      populatedJobs.map(async (job: any) => {
        const j = job.toObject ? job.toObject() : job;
        const isOwner =
          (j.userId &&
            (j.userId._id ? j.userId._id.toString() : j.userId.toString())) ===
          userId.toString();
        const isAssignee =
          (j.assignedTo &&
            (j.assignedTo._id
              ? j.assignedTo._id.toString()
              : j.assignedTo.toString())) === userId.toString();

        const ownerName = j.userId && j.userId.name ? j.userId.name : null;
        const assigneeName =
          j.assignedTo && j.assignedTo.name ? j.assignedTo.name : null;

        const hasCurrentUserReviewed = !!(await Review.findOne({
          jobId: j._id,
          reviewerId: userId,
        }));

        const canReview =
          j.status === "completed" &&
          (isOwner || isAssignee) &&
          !hasCurrentUserReviewed;

        return {
          ...j,
          isOwner,
          isAssignee,
          ownerName,
          assigneeName,
          canComplete: isOwner,
          canReview,
          hasCurrentUserReviewed,
        };
      })
    );

    res.json({ myApprovedJobs: mappedJobs, pagination });
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

    const requesterId = request.userId?.toString();
    const requestUser = await User.findById(requesterId);

    request.status = "rejected";
    await request.save();

    io.emit("requestRejected", { request }); // Emit event for real-time update
    sendNotification({
      deviceTokens: [requestUser?.deviceToken].filter(Boolean) as string[], // Assuming requesterId is the device token
      message: `Your request for job ${job.title} has been rejected.`,
      title: "Job Request Rejected",
      data: { jobId },
    });
    res.json({ message: "Request rejected", request });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

export const completeJob = async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const userId = (req as any).user?.id || (req as any).user?._id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    const isOwner = job.userId && job.userId.toString() === userId.toString();

    if (!isOwner) {
      return res.status(403).json({ error: "Forbidden: not job owner " });
    }

    job.status = "completed";
    await job.save();

    io.emit("jobCompleted", { jobId, assignedTo: job.assignedTo });
    res.json({ message: "Job marked as completed", job });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// Add after completeJob (or anywhere exported in this file)
export const leaveReview = async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const { rating, comment, revieweeId } = req.body;
  const reviewerId = (req as any).user?.id || (req as any).user?._id;

  if (!reviewerId) return res.status(401).json({ error: "Unauthorized" });
  if (!rating || !revieweeId)
    return res.status(400).json({ error: "rating and revieweeId required" });

  try {
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    // Only owner or assigned user can leave reviews after completion
    const isOwner =
      job.userId && job.userId.toString() === reviewerId.toString();
    const isAssignee =
      job.assignedTo && job.assignedTo.toString() === reviewerId.toString();
    if (!isOwner && !isAssignee) {
      return res.status(403).json({ error: "Forbidden: not participant" });
    }

    // reviewee must be the other participant
    const expectedReviewee =
      isOwner && job.assignedTo
        ? job.assignedTo.toString()
        : isAssignee
        ? job.userId.toString()
        : null;
    if (!expectedReviewee || expectedReviewee !== revieweeId.toString()) {
      return res
        .status(400)
        .json({ error: "revieweeId must be the other participant of the job" });
    }

    // Prevent duplicate review by same reviewer for same job
    const existing = await Review.findOne({ jobId, reviewerId });
    if (existing)
      return res.status(400).json({ error: "Review already submitted" });

    const review = new Review({
      jobId,
      reviewerId,
      revieweeId,
      rating,
      comment,
    });
    await review.save();

    io.emit("reviewCreated", { review });

    res.status(201).json({ message: "Review submitted", review });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

export const getReviewsByJob = async (req: Request, res: Response) => {
  const { jobId } = req.params;
  try {
    const reviews = await Review.find({ jobId })
      .populate("reviewerId", "name phone")
      .populate("revieweeId", "name phone");
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

export const getReviewsByUser = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || (req as any).user?._id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const { page = 1, limit = 5 } = req.query;

    let pageNum = parseInt(page as string, 10);
    let limitNum = parseInt(limit as string, 10);
    if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (isNaN(limitNum) || limitNum < 1) limitNum = 5;

    const { results: reviews, pagination } = await paginate(
      Review,
      { revieweeId: userId },
      {
        page: pageNum,
        limit: limitNum,
        sort: { createdAt: -1 },
      }
    );

    const populatedReviews = await Review.populate(reviews, {
      path: "reviewerId",
      select: "name phone",
    });
    res.json({ reviews: populatedReviews, pagination });
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
