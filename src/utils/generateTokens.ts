import jwt from "jsonwebtoken";
const jwtSecret = process.env.JWT_SECRET || "secret";
const refreshSecret = process.env.REFRESH_SECRET || "refreshSecret"; // Use a separate secret for refresh tokens

export const generateTokens = (userId: string, phone: string) => {
  const accessToken = jwt.sign({ id: userId, phone }, jwtSecret, {
    expiresIn: "15m",
  }); // Short-lived
  const refreshToken = jwt.sign({ id: userId }, refreshSecret, {
    expiresIn: "7d",
  }); // Long-lived
  return { accessToken, refreshToken };
};
