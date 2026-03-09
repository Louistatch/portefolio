import type { Express } from "express";
import multer from "multer";
import { supabase } from "./supabase";
import { requireAuth } from "./auth";
import crypto from "crypto";
import path from "path";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

const ALLOWED_DOCS = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"];
const ALLOWED_IMAGES = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];

const MIME_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export function registerUploadRoutes(app: Express) {
  // Upload document (PDF, Word, Excel)
  app.post("/api/admin/upload/document", requireAuth, upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file provided" });
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!ALLOWED_DOCS.includes(ext)) return res.status(400).json({ message: `Invalid file type. Allowed: ${ALLOWED_DOCS.join(", ")}` });

    const filename = `${crypto.randomUUID()}${ext}`;
    const { error } = await supabase.storage.from("documents").upload(filename, req.file.buffer, {
      contentType: MIME_MAP[ext] || req.file.mimetype,
      upsert: false,
    });
    if (error) return res.status(500).json({ message: error.message });

    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(filename);
    res.json({ url: urlData.publicUrl, filename: req.file.originalname });
  });

  // Upload image
  app.post("/api/admin/upload/image", requireAuth, upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file provided" });
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!ALLOWED_IMAGES.includes(ext)) return res.status(400).json({ message: `Invalid file type. Allowed: ${ALLOWED_IMAGES.join(", ")}` });

    const filename = `${crypto.randomUUID()}${ext}`;
    const { error } = await supabase.storage.from("images").upload(filename, req.file.buffer, {
      contentType: MIME_MAP[ext] || req.file.mimetype,
      upsert: false,
    });
    if (error) return res.status(500).json({ message: error.message });

    const { data: urlData } = supabase.storage.from("images").getPublicUrl(filename);
    res.json({ url: urlData.publicUrl, filename: req.file.originalname });
  });
}
