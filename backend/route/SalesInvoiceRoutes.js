import express from "express";
import {
  createSalesInvoice,
  getSalesInvoices,
  getSalesInvoiceById,
  updateSalesInvoice,
  deleteSalesInvoice,
  getNextInvoiceNumber,
} from "../controllers/SalesInvoiceController.js";

const router = express.Router();

router
  .route("/sales/invoices")
  .get(getSalesInvoices)
  .post(createSalesInvoice);

router
  .route("/sales/invoices/:id")
  .get(getSalesInvoiceById)
  .put(updateSalesInvoice)
  .delete(deleteSalesInvoice);

// ✔ Added working route for next invoice number
router.post("/sales/invoices/next-number", getNextInvoiceNumber);

export default router;


