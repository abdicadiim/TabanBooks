import express, { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import * as organizationsController from "../controllers/organizations.controller.js";

const router: Router = express.Router();

router.use(protect);

router
  .route("/organizations")
  .get(organizationsController.listOrganizations)
  .post(organizationsController.createOrganization);

router
  .route("/organizations/:organization_id")
  .get(organizationsController.getOrganization)
  .put(organizationsController.updateOrganization);

export default router;
