import express from "express";
import { createShoeItem, getShoeItems, getShoeItemById, updateShoeItem, deleteShoeItem, getShoeItemHistory } from "../controllers/ShoeItemController.js";

const router = express.Router();

router
  .route("/shoe-sales/items")
  .get(getShoeItems)
  .post(createShoeItem);

router
  .route("/shoe-sales/items/:itemId")
  .get(getShoeItemById)
  .put(updateShoeItem)
  .delete(deleteShoeItem);

router
  .route("/shoe-sales/items/:itemId/history")
  .get(getShoeItemHistory);

export default router;

