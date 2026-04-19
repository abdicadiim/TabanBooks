/**
 * Inventory Routes
 * Items & Inventory Adjustments routes
 */

import express, { Router } from "express";
import * as inventoryController from "../controllers/inventory.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router: Router = express.Router();

// All routes require authentication
router.use(protect);

// Items routes
router.get("/items", inventoryController.getItems);
router.post("/items", inventoryController.createItem);
router.get("/items/:id", inventoryController.getItem);
router.put("/items/:id", inventoryController.updateItem);
router.patch("/items/:id", inventoryController.updateItem);
router.delete("/items/:id", inventoryController.deleteItem);

// Inventory Adjustments routes
router.get("/inventory-adjustments", inventoryController.getInventoryAdjustments);
router.get("/inventory-adjustments/search", inventoryController.searchInventoryAdjustments);
router.get("/inventory-adjustments/:id", inventoryController.getInventoryAdjustment);
router.post("/inventory-adjustments/:id/clone", inventoryController.cloneInventoryAdjustment);
router.post("/inventory-adjustments", inventoryController.createInventoryAdjustment);
router.put("/inventory-adjustments/:id", inventoryController.updateInventoryAdjustment);
router.patch("/inventory-adjustments/:id", inventoryController.updateInventoryAdjustment);
router.delete("/inventory-adjustments/:id", inventoryController.deleteInventoryAdjustment);
router.post("/inventory-adjustments/bulk-delete", inventoryController.deleteInventoryAdjustments);

// Inventory Adjustment Reasons routes
router.get("/adjustment-reasons", inventoryController.getInventoryAdjustmentReasons);
router.post("/adjustment-reasons", inventoryController.createInventoryAdjustmentReason);
router.delete("/adjustment-reasons/:id", inventoryController.deleteInventoryAdjustmentReason);

export default router;

