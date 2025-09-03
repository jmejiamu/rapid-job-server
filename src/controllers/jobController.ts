import { Request, Response } from "express";
import Job from "../models/Job";
import { io } from "../index";
//Home end point
export const getJobs = async (req: Request, res: Response) => {
  try {
    const { title } = req.query;
    const filter: Partial<Record<keyof typeof Job.schema.obj, unknown>> = {};
    if (title) {
      filter.title = { $regex: title, $options: "i" };
    }
    const jobs = await Job.find(filter).sort({ postedAt: -1 });
    res.json(jobs);
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
    const jobs = await Job.find({ userId: userId }).sort({ postedAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};
