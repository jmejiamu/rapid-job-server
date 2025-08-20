import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const jwtSecret = process.env.JWT_SECRET || "secret";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, jwtSecret);
    // Ensure decoded has an id property
    if (typeof decoded === "object" && "id" in decoded && decoded.id) {
      (req as any).user = decoded;
      next();
    } else {
      return res
        .status(401)
        .json({ error: "Invalid token payload: missing user id" });
    }
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};
