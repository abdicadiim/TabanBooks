import multer from "multer";
import path from "path";
import fs from "fs";

// Store uploads under ./uploads/<organizationId>/
const storage = multer.diskStorage({
  destination: (req: any, file, cb) => {
    try {
      const orgId = (req.user && req.user.organizationId) ? String(req.user.organizationId) : "public";
      const dest = path.join(process.cwd(), "uploads", orgId);
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    } catch (err) {
      cb(err as any, "uploads");
    }
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    cb(null, `${unique}-${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

export default upload;
