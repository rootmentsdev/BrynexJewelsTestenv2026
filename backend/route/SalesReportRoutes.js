import express from "express";
import {
  getSalesSummary,
  getSalesByItem,
  getSalesReturnSummary,
  getSalesByInvoice
} from "../controllers/SalesReportController.js";
import { getSalesByGroup } from "../controllers/SalesByGroupController.js";

const router = express.Router();

router.get("/by-invoice", getSalesByInvoice);
router.get("/summary", getSalesSummary);
router.get("/by-item", getSalesByItem);
router.get("/returns", getSalesReturnSummary);
router.get("/by-group", getSalesByGroup);

export default router;
