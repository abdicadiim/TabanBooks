import { Router } from "express";
import { getWebsiteHomeData } from "../controllers/website.controller.js";

const router = Router();

router.get("/home", getWebsiteHomeData);

export default router;
