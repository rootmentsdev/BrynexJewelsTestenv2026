import express from "express";
import {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} from "../controllers/BrandController.js";

const router = express.Router();

router
  .route("/shoe-sales/brands")
  .get(getBrands)
  .post(createBrand);

router
  .route("/shoe-sales/brands/:brandId")
  .put(updateBrand)
  .delete(deleteBrand);

export default router;

