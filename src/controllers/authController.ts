import jwt from "jsonwebtoken";
import twilio from "twilio";
import { Request, Response } from "express";

import User from "../models/User";
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID!;
const jwtSecret = process.env.JWT_SECRET || "secret";

const client = twilio(accountSid, authToken);

export const register = async (req: Request, res: Response) => {
  const { phone, name } = req.body;
  if (!phone || !name)
    return res.status(400).json({ error: "Phone and name required" });

  let user = await User.findOne({ phone });
  if (user && user.isVerified)
    return res.status(400).json({ error: "User already exists" });

  if (!user) {
    user = new User({ phone, name, isVerified: false });
  } else {
    user.name = name;
    user.isVerified = false;
  }
  await user.save();

  // Send verification code using Twilio Verify
  try {
    await client.verify
      .services(verifyServiceSid)
      .verifications.create({ to: phone, channel: "sms" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to send verification code" });
  }
};

export const verify = async (req: Request, res: Response) => {
  const { phone, code } = req.body;
  const user = await User.findOne({ phone });
  if (!user) return res.status(404).json({ error: "User not found" });

  // Verify code using Twilio Verify
  try {
    const verificationCheck = await client.verify
      .services(verifyServiceSid)
      .verificationChecks.create({ to: phone, code });
    if (verificationCheck.status !== "approved") {
      return res.status(400).json({ error: "Invalid code" });
    }
    user.isVerified = true;
    await user.save();
    const token = jwt.sign({ id: user._id, phone: user.phone }, jwtSecret, {
      expiresIn: "7d",
    });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: "Verification failed" });
  }
};

export const login = async (req: Request, res: Response) => {
  const { phone } = req.body;
  const user = await User.findOne({ phone });
  if (!user || !user.isVerified)
    return res.status(400).json({ error: "User not verified" });

  const token = jwt.sign({ id: user._id, phone: user.phone }, jwtSecret, {
    expiresIn: "7d",
  });
  res.json({ token });
};
