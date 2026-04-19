import express, { Router } from "express";
import * as paymentTermsController from "../controllers/paymentTerms.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router: Router = express.Router();
router.use(protect);

router.route("/")
    .get(paymentTermsController.getAll)
    .post(paymentTermsController.create);

router.route("/:id")
    .put(paymentTermsController.update)
    .delete(paymentTermsController.deleteTerm);

export default router;
