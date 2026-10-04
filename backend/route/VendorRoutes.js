import express from "express";
import {
  createVendor,
  getVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
} from "../controllers/VendorController.js";
import { getVendorHistory } from "../controllers/VendorHistoryController.js";

const router = express.Router();

router
  .route("/purchase/vendors")
  .get(getVendors)
  .post(createVendor);

// More specific route must come before the general :id route
router
  .route("/purchase/vendors/:vendorId/history")
  .get(getVendorHistory);

router
  .route("/purchase/vendors/:id")
  .get(getVendorById)
  .put(updateVendor)
  .delete(deleteVendor);

export default router;

