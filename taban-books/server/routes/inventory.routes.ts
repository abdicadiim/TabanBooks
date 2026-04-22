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

// Products routes (mapped to items)
router.get("/products", inventoryController.getItems);
router.post("/products", inventoryController.createItem);
router.get("/products/:id", inventoryController.getItem);
router.put("/products/:id", inventoryController.updateItem);
router.patch("/products/:id", inventoryController.updateItem);
router.delete("/products/:id", inventoryController.deleteItem);

// Plans routes (mapped to items)
router.get("/plans", inventoryController.getItems);
router.post("/plans", inventoryController.createItem);
router.get("/plans/:id", inventoryController.getItem);
router.put("/plans/:id", inventoryController.updateItem);
router.patch("/plans/:id", inventoryController.updateItem);
router.delete("/plans/:id", inventoryController.deleteItem);

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

// Price Lists stub routes
router.get("/price-lists", (_req, res) => res.json({ success: true, data: [] }));
router.get("/price-lists/:id", (_req, res) => res.json({ success: true, data: null }));
router.post("/price-lists", (_req, res) => res.status(201).json({ success: true, data: _req.body }));
router.put("/price-lists/:id", (_req, res) => res.json({ success: true, data: _req.body }));
router.delete("/price-lists/:id", (_req, res) => res.json({ success: true, message: "Price list deleted (stub)" }));

export default router;

