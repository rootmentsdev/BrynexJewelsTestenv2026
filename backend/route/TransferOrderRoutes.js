import express from "express";
import {
  createTransferOrder,
  getTransferOrders,
  getTransferOrderById,
  updateTransferOrder,
  deleteTransferOrder,
  receiveTransferOrder,
  getItemStock,
} from "../controllers/TransferOrderController.js";

const router = express.Router();

router
  .route("/inventory/transfer-orders")
  .get(getTransferOrders)
  .post(createTransferOrder);

router
  .route("/inventory/transfer-orders/:id")
  .get(getTransferOrderById)
  .put(updateTransferOrder)
  .delete(deleteTransferOrder);

router
  .route("/inventory/transfer-orders/:id/receive")
  .put(receiveTransferOrder);

router
  .route("/inventory/transfer-orders/stock/item")
  .get(getItemStock);

export default router;


