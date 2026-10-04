import VendorHistory from "../model/VendorHistory.js";

// Get vendor history by vendor ID
export const getVendorHistory = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { limit = 100 } = req.query;

    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    const history = await VendorHistory.find({ vendorId: vendorId.toString() })
      .sort({ changedAt: -1 })
      .limit(parseInt(limit));

    const historyData = history.map(item => {
      const obj = item.toObject();
      obj.id = obj._id.toString();
      return obj;
    });

    res.status(200).json(historyData);
  } catch (error) {
    console.error("Get vendor history error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
