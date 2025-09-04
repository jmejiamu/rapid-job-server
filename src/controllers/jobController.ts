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
