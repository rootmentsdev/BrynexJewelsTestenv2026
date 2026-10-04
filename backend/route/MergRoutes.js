import express from "express";
import { getMergedTransactions } from "../controllers/TwsTransaction.js";

const router = express.Router();

router.get("/mergedTransactions", getMergedTransactions);

export default router;
