/**
 * Documents Routes
 */

import express, { Router } from "express";
import * as documentsController from "../controllers/documents.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";

const router: Router = express.Router();
router.use(protect);

router.route("/documents")
	.get(documentsController.getDocuments)
	.post(upload.single('file'), documentsController.createDocument);

router.get("/documents/sync", documentsController.getDocumentsSync);
router.get("/documents/:id/download", documentsController.downloadDocument);

router.route("/documents/:id")
	.get(documentsController.getDocumentById)
	.put(documentsController.updateDocument)
	.delete(documentsController.deleteDocument);

export default router;

