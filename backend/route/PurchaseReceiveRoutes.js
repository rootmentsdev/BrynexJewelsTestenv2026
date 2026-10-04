import express from "express";
import {
  createPurchaseReceive,
  getPurchaseReceives,
  getPurchaseReceiveById,
  updatePurchaseReceive,
  deletePurchaseReceive,
  getNextReceiveNumber,
  sendPurchaseReceive,
} from "../controllers/PurchaseReceiveController.js";

const router = express.Router();

router.get("/purchase/receives/next-number", getNextReceiveNumber); // Get next auto-generated receive number

router
  .route("/purchase/receives")
  .get(getPurchaseReceives)
  .post(createPurchaseReceive);

router
  .route("/purchase/receives/:id")
  .get(getPurchaseReceiveById)
  .put(updatePurchaseReceive)
  .delete(deletePurchaseReceive);

router.post("/purchase/receives/:id/send", sendPurchaseReceive); // Send purchase receive (draft to in_transit)

export default router;

