import { Router } from "express";
import { register, verify, login } from "../controllers/authController";

const router = Router();

router.post("/register", register);
router.post("/verify-otp", verify);
router.post("/login", login);

export default router;
