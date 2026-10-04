import express from "express";
import {
  createInventoryAdjustment,
  getInventoryAdjustments,
  getInventoryAdjustmentById,
  updateInventoryAdjustment,
  deleteInventoryAdjustment,
  getItemStock,
  getNextReferenceNumber,
} from "../controllers/InventoryAdjustmentController.js";

const router = express.Router();

// IMPORTANT: Specific routes must come BEFORE parameterized routes
router
  .route("/inventory/adjustments/next-reference")
  .get(getNextReferenceNumber);

router
  .route("/inventory/adjustments/stock/item")
  .get(getItemStock);

router
  .route("/inventory/adjustments")
  .get(getInventoryAdjustments)
  .post(createInventoryAdjustment);

router
  .route("/inventory/adjustments/:id")
  .get(getInventoryAdjustmentById)
  .put(updateInventoryAdjustment)
  .delete(deleteInventoryAdjustment);

export default router;




