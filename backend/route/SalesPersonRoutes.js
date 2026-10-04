import express from "express";
import {
  createSalesPerson,
  getSalesPersons,
  getSalesPersonsByLocCode,
  getSalesPersonById,
  updateSalesPerson,
  deleteSalesPerson,
} from "../controllers/SalesPersonController.js";

const router = express.Router();

// Create sales person
router.post("/sales-persons", createSalesPerson);

// Get all sales persons (optional queries: ?storeId=xxx&locCode=xxx&isActive=true/false)
router.get("/sales-persons", getSalesPersons);

// Get sales persons by location code (e.g., /sales-persons/loc/EDAPALLY)
// This is the main endpoint for filtering by store location
router.get("/sales-persons/loc/:locCode", getSalesPersonsByLocCode);

// Get sales person by ID
router.get("/sales-persons/:id", getSalesPersonById);

// Update sales person
router.put("/sales-persons/:id", updateSalesPerson);

// Delete sales person (soft delete)
router.delete("/sales-persons/:id", deleteSalesPerson);

export default router;
