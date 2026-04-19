/**
 * Users Routes
 */

import express, { Router } from "express";
import * as usersController from "../controllers/users.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router: Router = express.Router();
router.use(protect);

router.route("/users")
    .get(usersController.getUsers)
    .post(usersController.createUser);

router.route("/users/:id")
    .get(usersController.getUserById)
    .put(usersController.updateUser)
    .delete(usersController.deleteUser);

router.post("/users/:id/invite", usersController.sendInvitation);

router.get("/users/me/permissions", usersController.getMyPermissions);

export default router;

