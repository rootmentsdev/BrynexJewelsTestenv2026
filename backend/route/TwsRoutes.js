import express from "express";
import { getEditedTransactions } from "../controllers/EditController.js";
import { getsaveCashBank } from "../controllers/EditController.js";


const router = express.Router();

router.get("/getEditedTransactions", getEditedTransactions);
router.get("/getsaveCashBank", getsaveCashBank);




export default router;
