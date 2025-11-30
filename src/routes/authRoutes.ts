import { Router } from "express";
import {
  register,
  verify,
  login,
  refresh,
  logout,
} from "../controllers/authController";

const router = Router();

router.post("/register", register);
router.post("/verify-otp", verify);
router.post("/login", login);
router.post("/refresh", refresh); // New route
router.post("/logout", logout); // New route

export default router;
