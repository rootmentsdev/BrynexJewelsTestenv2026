import express from "express";
import {
  getManufacturers,
  createManufacturer,
  updateManufacturer,
  deleteManufacturer,
} from "../controllers/ManufacturerController.js";

const router = express.Router();

router
  .route("/shoe-sales/manufacturers")
  .get(getManufacturers)
  .post(createManufacturer);

router
  .route("/shoe-sales/manufacturers/:manufacturerId")
  .put(updateManufacturer)
  .delete(deleteManufacturer);

export default router;

