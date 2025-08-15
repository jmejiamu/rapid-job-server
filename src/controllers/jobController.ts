import { Request, Response } from "express";
import Job from "../models/Job";

export const getJobs = async (req: Request, res: Response) => {
  try {
    const jobs = await Job.find();
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

export const createJob = async (req: Request, res: Response) => {
  const { title, pay, address, description } = req.body;

  try {
    const newJob = new Job({ title, pay, address, description });
    await newJob.save();
    res.status(201).json(newJob);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};
