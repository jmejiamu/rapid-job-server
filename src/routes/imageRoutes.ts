import { Router } from "express";
import { imageUploader } from "../controllers/imageUploaderController";
import multer from "multer";
const router = Router();
const upload = multer();

router.post(
  "/upload-images",
  upload.fields([{ name: "images", maxCount: 10 }]),
  imageUploader
);

export default router;
