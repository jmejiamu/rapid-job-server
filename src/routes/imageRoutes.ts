import { Router } from "express";
import {
  deleteImage,
  imageUploader,
} from "../controllers/imageUploaderController";
import multer from "multer";
const router = Router();
const upload = multer();

router.post(
  "/upload-images",
  upload.fields([{ name: "images", maxCount: 10 }]),
  imageUploader
);
router.post("/delete-image", deleteImage);

export default router;
