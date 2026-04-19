import express, { Router } from "express";
import * as contactsController from "../controllers/contacts.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { normalizeUnifiedContactRequest } from "../middleware/contact.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import {
  unifiedContactCreateSchema,
  unifiedContactUpdateSchema,
} from "../utils/contactSchemas.js";

const router: Router = express.Router();

router.use(protect);

router.get("/contacts", contactsController.listContacts);
router.post(
  "/contacts",
  normalizeUnifiedContactRequest("create"),
  validate(unifiedContactCreateSchema, { stripUnknown: false }),
  contactsController.createContact
);
router.get("/contacts/:contact_id", contactsController.getContact);
router.put(
  "/contacts/:contact_id",
  normalizeUnifiedContactRequest("update"),
  validate(unifiedContactUpdateSchema, { stripUnknown: false }),
  contactsController.updateContact
);
router.delete("/contacts/:contact_id", contactsController.deleteContact);
router.post("/contacts/:contact_id/active", contactsController.markContactActive);
router.post("/contacts/:contact_id/inactive", contactsController.markContactInactive);

export default router;

