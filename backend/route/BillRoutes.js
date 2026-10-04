import express from "express";
import {
  createBill,
  getBills,
  getBillById,
  updateBill,
  deleteBill,
  convertPurchaseOrderToBill,
  convertPurchaseReceiveToBill,
} from "../controllers/BillController.js";

const router = express.Router();

router
  .route("/purchase/bills")
  .get(getBills)
  .post(createBill);

router
  .route("/purchase/bills/:id")
  .get(getBillById)
  .put(updateBill)
  .delete(deleteBill);

// Convert Purchase Order to Bill
router
  .route("/purchase/orders/:purchaseOrderId/convert-to-bill")
  .post(convertPurchaseOrderToBill);

// Convert Purchase Receive to Bill
router
  .route("/purchase/receives/:purchaseReceiveId/convert-to-bill")
  .post(convertPurchaseReceiveToBill);

// Direct 1-Click Raw Thermal ZPL Print
router.post("/purchase/print-thermal-tag", async (req, res) => {
  try {
    const { zpl, printerName } = req.body;
    if (!zpl) {
      return res.status(400).json({ success: false, message: "ZPL string is required" });
    }
    if (process.platform !== "win32") {
      return res.status(200).json({
        success: false,
        message: "Server is running on Linux/Cloud (Vercel). Windows printer spooler is only available on local Windows host.",
      });
    }
    const { sendRawZplToPrinter } = await import("../utils/rawPrinter.js");
    const result = await sendRawZplToPrinter(zpl, printerName || "BOXP BP 4206e (203 dpi) - ZPL");
    return res.json(result);
  } catch (error) {
    console.error("Thermal tag print error:", error);
    return res.status(200).json({ success: false, message: error.message || "Failed to print thermal tag" });
  }
});

export default router;

