import jwt from "jsonwebtoken";
import twilio from "twilio";
import { Request, Response } from "express";
import bcrypt from "bcrypt";

import User from "../models/User";
import { generateTokens } from "../utils/generateTokens";
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID!;
const refreshSecret = process.env.REFRESH_SECRET || "refreshSecret";

const client = twilio(accountSid, authToken);

export const register = async (req: Request, res: Response) => {
  const { phone, name } = req.body;

  if (!phone || !name)
    return res.status(400).json({ error: "Phone and name required" });

  const user = await User.findOne({ phone });
  if (user && user.isVerified)
    return res.status(400).json({ error: "User already exists" });

  // Only send verification code, do not create user yet
  try {
    await client.verify
      .services(verifyServiceSid)
      .verifications.create({ to: phone, channel: "sms" });
    res.json({ success: true });
  } catch (err) {
    console.error("Error sending verification code:", err);
    res.status(500).json({ error: "Failed to send verification code" });
  }
};

export const verify = async (req: Request, res: Response) => {
  const { phone, code, name } = req.body;
  let user = await User.findOne({ phone });

  // Verify code using Twilio Verify
  try {
    const verificationCheck = await client.verify
      .services(verifyServiceSid)
      .verificationChecks.create({ to: phone, code });
    if (verificationCheck.status !== "approved") {
      return res.status(400).json({ error: "Invalid code" });
    }

    if (!user) {
      if (!name) {
        return res.status(400).json({ error: "Name required for new user" });
      }
      user = new User({ phone, name, isVerified: true });
    } else {
      user.isVerified = true;
      if (name) user.name = name;
    }
    await user.save();

    const { accessToken, refreshToken } = generateTokens(
      user._id as string,
      user.phone
    );
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    user.refreshToken = hashedRefreshToken;
    await user.save();

    res.json({
      accessToken,
      refreshToken,
      name: user.name,
      phone: user.phone,
      userId: user._id,
    });
  } catch (err) {
    res.status(500).json({ error: "Verification failed" });
  }
};

export const login = async (req: Request, res: Response) => {
  const { phone } = req.body;
  const user = await User.findOne({ phone });
  if (!user || !user.isVerified)
    return res.status(400).json({ error: "User not verified" });

  const { accessToken, refreshToken } = generateTokens(
    user._id as string,
    user.phone
  );
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  user.refreshToken = hashedRefreshToken;
  await user.save();

  res.json({
    accessToken,
    refreshToken,
    name: user.name,
    phone: user.phone,
    userId: user._id,
  });
};

export const refresh = async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const refreshToken = authHeader?.split(" ")[1];
  if (!refreshToken) return res.status(401).json({ error: "No refresh token" });

  try {
    const decoded = jwt.verify(refreshToken, refreshSecret) as { id: string };
    const user = await User.findById(decoded.id);
    if (
      !user ||
      !user.refreshToken ||
      !(await bcrypt.compare(refreshToken, user.refreshToken))
    ) {
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      user._id as string,
      user.phone
    );
    const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 10);
    user.refreshToken = hashedNewRefreshToken;
    await user.save();

    res.json({
      accessToken,
      refreshToken: newRefreshToken,
      name: user.name,
      phone: user.phone,
      userId: user._id,
    });
  } catch (err) {
    res.status(403).json({ error: "Invalid refresh token" });
  }
};

// New logout function
// TODO: implement this later if it is needed
export const logout = async (req: Request, res: Response) => {
  const { refreshToken } = req.cookies;
  if (refreshToken) {
    // Invalidate the refresh token in DB
    const decoded = jwt.verify(refreshToken, refreshSecret) as { id: string };
    const user = await User.findById(decoded.id);
    if (user) {
      user.refreshToken = undefined;
      await user.save();
    }
  }
  res.json({ message: "Logged out" });
};
