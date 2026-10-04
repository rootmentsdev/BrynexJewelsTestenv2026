import express from "express";
import {
  createStoreOrder,
  getStoreOrders,
  getStoreOrderById,
  updateStoreOrder,
  deleteStoreOrder,
  getItemStockForStore,
  getNextOrderNumber,
} from "../controllers/StoreOrderController.js";

const router = express.Router();

router.get("/inventory/store-orders/next-number", getNextOrderNumber); // Get next auto-generated order number

router
  .route("/inventory/store-orders")
  .get(getStoreOrders)
  .post(createStoreOrder);

router
  .route("/inventory/store-orders/:id")
  .get(getStoreOrderById)
  .put(updateStoreOrder)
  .delete(deleteStoreOrder);

router
  .route("/inventory/store-orders/stock/item")
  .get(getItemStockForStore);

export default router;
