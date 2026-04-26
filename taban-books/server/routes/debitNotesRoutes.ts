import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  listDebitNotes,
  getDebitNoteById,
  createDebitNote,
  updateDebitNote,
  deleteDebitNote,
  getNextDebitNoteNumber,
  sendDebitNoteEmail,
} from "../controllers/debitNotesController.js";

const router = express.Router();
router.use(protect);

router.get("/next-number", getNextDebitNoteNumber);
router.get("/", listDebitNotes);
router.get("/:id", getDebitNoteById);
router.post("/", createDebitNote);
router.post("/:id/send-email", sendDebitNoteEmail);
router.put("/:id", updateDebitNote);
router.delete("/:id", deleteDebitNote);

export default router;
