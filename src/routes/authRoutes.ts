import { Router } from "express";
import { register, verify, login } from "../controllers/authController";

const router = Router();

router.post("/register", register);
router.post("/verify", verify);
router.post("/login", login);

export default router;
