import express from "express";
import {
  createVendorCredit,
  getVendorCredits,
  getVendorCreditById,
  updateVendorCredit,
  deleteVendorCredit,
  getNextCreditNoteNumber,
  getAvailableVendorCredits,
  applyCreditToBill,
} from "../controllers/VendorCreditController.js";

const router = express.Router();

router.route("/purchase/vendor-credits/next-number").get(getNextCreditNoteNumber);

router
  .route("/purchase/vendor-credits")
  .get(getVendorCredits)
  .post(createVendorCredit);

router
  .route("/purchase/vendor-credits/:id")
  .get(getVendorCreditById)
  .put(updateVendorCredit)
  .delete(deleteVendorCredit);

router
  .route("/purchase/vendor-credits/available")
  .get(getAvailableVendorCredits);

router
  .route("/purchase/vendor-credits/apply-to-bill")
  .post(applyCreditToBill);

export default router;

