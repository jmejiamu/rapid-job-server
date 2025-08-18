import { Request, Response } from "express";
import { deleteFromS3, uploadToS3 } from "../utils/s3";
import sharp from "sharp";

export const imageUploader = async (req: Request, res: Response) => {
  try {
    const files = (req.files as { [fieldname: string]: Express.Multer.File[] })
      ?.images;
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "No image files provided" });
    }

    const results = await Promise.all(
      files.map(async (file: any) => {
        // Generate small and large versions using sharp
        const smBuffer = await sharp(file.buffer).resize(150).toBuffer();
        const lgBuffer = await sharp(file.buffer).resize(800).toBuffer();

        // Upload original, small, and large images
        const originalUrl = await uploadToS3(
          file.buffer,
          file.originalname,
          file.mimetype
        );
        const smUrl = await uploadToS3(
          smBuffer,
          `sm_${file.originalname}`,
          file.mimetype
        );
        const lgUrl = await uploadToS3(
          lgBuffer,
          `lg_${file.originalname}`,
          file.mimetype
        );

        return {
          filename: file.originalname,
          original: originalUrl,
          sm: smUrl,
          lg: lgUrl,
        };
      })
    );

    res.json({ images: results });
  } catch (err) {
    console.error("Error uploading images:", err);
    res.status(500).json({ error: "Failed to upload images" });
  }
};

export const deleteImage = async (req: Request, res: Response) => {
  try {
    const { imageKey } = req.body;
    if (!imageKey) {
      return res.status(400).json({ error: "No image key provided" });
    }

    // Extract the base filename (without sm_ or lg_)
    const baseKey = imageKey.replace(/^sm_|^lg_/, "");

    // Construct all keys
    const keysToDelete = [
      baseKey, // original
      `sm_${baseKey}`,
      `lg_${baseKey}`,
    ];

    // Delete all versions
    await Promise.all(keysToDelete.map((key) => deleteFromS3(key)));

    res.json({ message: "Image deleted successfully" });
  } catch (err) {
    console.error("Error deleting image:", err);
    res.status(500).json({ error: "Failed to delete image" });
  }
};
