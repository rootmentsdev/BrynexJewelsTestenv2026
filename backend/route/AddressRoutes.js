import express from "express";
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from "../controllers/AddressController.js";

const router = express.Router();

router
  .route("/purchase/addresses")
  .get(getAddresses)
  .post(createAddress);

router
  .route("/purchase/addresses/:id")
  .put(updateAddress)
  .delete(deleteAddress);

export default router;

