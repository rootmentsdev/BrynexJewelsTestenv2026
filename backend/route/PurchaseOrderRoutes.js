import express from "express";
import {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  getPurchaseOrderByNumber,
  updatePurchaseOrder,
  deletePurchaseOrder,
  getNextOrderNumber,
  sendPurchaseOrder,
} from "../controllers/PurchaseOrderController.js";

const router = express.Router();

router.get("/purchase/orders/next-number", getNextOrderNumber); // Get next auto-generated order number
router
  .route("/purchase/orders")
  .get(getPurchaseOrders)
  .post(createPurchaseOrder);

router
  .route("/purchase/orders/number/:orderNumber")
  .get(getPurchaseOrderByNumber);

router
  .route("/purchase/orders/:id")
  .get(getPurchaseOrderById)
  .put(updatePurchaseOrder)
  .delete(deletePurchaseOrder);

router.post("/purchase/orders/:id/send", sendPurchaseOrder); // Send purchase order (draft to sent)

export default router;

