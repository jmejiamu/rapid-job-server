import { Request, Response } from "express";
import User from "../models/User";
export const setNotificationPreference = async (
  req: Request,
  res: Response
) => {
  const userId = (req as any).user?.id || (req as any).user?._id;
  const { enabled } = req.body;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (typeof enabled !== "boolean")
    return res.status(400).json({ error: "enabled must be boolean" });

  const user = await User.findByIdAndUpdate(
    userId,
    { notificationsEnabled: enabled },
    { new: true }
  );
  res.json({ notificationsEnabled: user?.notificationsEnabled ?? false });
};
