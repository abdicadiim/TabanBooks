/**
 * Roles Routes
 */

import express, { Router } from "express";
import * as rolesController from "../controllers/roles.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router: Router = express.Router();
router.use(protect);

router.route("/roles")
    .get(rolesController.getRoles)
    .post(rolesController.createRole);

router.route("/roles/:id")
    .get(rolesController.getRoleById)
    .put(rolesController.updateRole)
    .delete(rolesController.deleteRole);

export default router;

