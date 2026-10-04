import express from "express";
import {
  createItemGroup,
  getItemGroups,
  getItemGroupById,
  updateItemGroup,
  deleteItemGroup,
  getItemHistory,
  saveMonthlyOpeningStock,
  getMonthlyOpeningStock,
  addItemsToGroup,
} from "../controllers/ItemGroupController.js";

const router = express.Router();

router
  .route("/shoe-sales/item-groups")
  .get(getItemGroups)
  .post(createItemGroup);

router
  .route("/shoe-sales/item-groups/add-items")
  .post(addItemsToGroup);

router
  .route("/shoe-sales/item-groups/:id")
  .get(getItemGroupById)
  .put(updateItemGroup)
  .delete(deleteItemGroup);

router
  .route("/shoe-sales/item-groups/:id/items/:itemId/history")
  .get(getItemHistory);

router
  .route("/shoe-sales/item-groups/:id/monthly-opening-stock")
  .post(saveMonthlyOpeningStock)
  .get(getMonthlyOpeningStock);

export default router;

