import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { logger } from "../../utils/logger.js";

const router = Router();

// Store uploads in ./uploads/
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    const dir = path.resolve("./uploads");
    await fs.mkdir(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

/**
 * POST /api/upload — Upload reference images.
 * Returns array of file paths to pass to the project creation endpoint.
 */
router.post(
  "/",
  upload.array("images", 10),
  (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }

    const paths = files.map((f) => f.path);
    logger.info(`Uploaded ${files.length} image(s)`);
    res.json({ images: paths });
  }
);

export default router;
