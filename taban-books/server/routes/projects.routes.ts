/**
 * Projects Routes
 */

import express, { Router } from "express";
import * as projectsController from "../controllers/projects.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router: Router = express.Router();
router.use(protect);

// Projects routes
router
  .route("/projects")
  .get(projectsController.getProjects)
  .post(projectsController.createProject);

router
  .route("/projects/:id")
  .get(projectsController.getProject)
  .put(projectsController.updateProject)
  .delete(projectsController.deleteProject);

// Time entries routes
router
  .route("/time-entries")
  .get(projectsController.getTimeEntries)
  .post(projectsController.createTimeEntry);

router
  .route("/time-entries/:id")
  .get(projectsController.getTimeEntry)
  .put(projectsController.updateTimeEntry)
  .delete(projectsController.deleteTimeEntry);

export default router;

