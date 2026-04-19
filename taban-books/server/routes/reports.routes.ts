/**
 * Reports Routes
 */

import express, { Router } from "express";
import * as reportsController from "../controllers/reports.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router: Router = express.Router();
router.use(protect);

// Catalog
router.get("/reports", reportsController.getReports);
router.get("/reports/catalog", reportsController.getReportsCatalog);

// Layout and report settings
router.get("/reports/layout", reportsController.getReportLayout);
router.put("/reports/layout", reportsController.updateReportLayout);
router.get("/reports/settings", reportsController.getReportSettings);
router.put("/reports/settings", reportsController.updateReportSettings);

// Custom reports
router.get("/reports/custom", reportsController.getCustomReports);
router.post("/reports/custom", reportsController.createCustomReport);
router.put("/reports/custom/:id", reportsController.updateCustomReport);
router.delete("/reports/custom/:id", reportsController.deleteCustomReport);

// Schedules
router.get("/reports/schedules", reportsController.getReportSchedules);
router.post("/reports/schedules", reportsController.createReportSchedule);
router.put("/reports/schedules/:id", reportsController.updateReportSchedule);
router.patch("/reports/schedules/:id/toggle", reportsController.toggleReportSchedule);
router.delete("/reports/schedules/:id", reportsController.deleteReportSchedule);

// Report-level share
router.get("/reports/:reportKey/share", reportsController.getReportShare);
router.put("/reports/:reportKey/share", reportsController.updateReportShare);

// Report details and run
router.get("/reports/:reportKey", reportsController.getReportByKey);
router.post("/reports/:reportKey/run", reportsController.runReportByKey);

export default router;

