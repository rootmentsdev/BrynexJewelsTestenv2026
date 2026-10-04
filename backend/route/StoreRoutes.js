import express from "express";
import {
  createStore,
  getStores,
  getStoreById,
  getStoreByLocCode,
  updateStore,
  deleteStore,
} from "../controllers/StoreController.js";

const router = express.Router();

// Create store
router.post("/stores", createStore);

// Get all stores (optional query: ?isActive=true/false)
router.get("/stores", getStores);

// Get store by location code (e.g., /stores/loc/EDAPALLY)
router.get("/stores/loc/:locCode", getStoreByLocCode);

// Get store by ID
router.get("/stores/:id", getStoreById);

// Update store
router.put("/stores/:id", updateStore);

// Delete store (soft delete)
router.delete("/stores/:id", deleteStore);

export default router;
