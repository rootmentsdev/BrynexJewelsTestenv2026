import SalesInvoice from "../model/SalesInvoice.js";

export const getSalesByGroup = async (req, res) => {
  try {
    const { dateFrom, dateTo, locCode } = req.query;
    const userId = req.query.userId;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ success: false, message: "dateFrom and dateTo are required" });
    }

    const query = {
      invoiceDate: {
        $gte: new Date(dateFrom + "T00:00:00.000Z"),
        $lte: new Date(dateTo + "T23:59:59.999Z"),
      },
      status: { $ne: "draft" },
    };

    if (locCode && locCode !== "all") query.locCode = locCode;
    // Only filter by userId for non-admin, non-cluster-manager users
    // Cluster managers and admins should see all invoices for the selected store(s)
    const isAdminUser = req.query.isAdmin === "true";
    const isClusterManager = req.query.isClusterManager === "true";
    if (userId && !isAdminUser && !isClusterManager) query.userId = userId;

    // For cluster manager "all" — filter by their allowed stores
    const allowedLocCodes = req.query.allowedLocCodes ? req.query.allowedLocCodes.split(",") : [];
    if (locCode === "all" && isClusterManager && allowedLocCodes.length > 0) {
      query.locCode = { $in: allowedLocCodes };
    }

    const invoices = await SalesInvoice.find(query).lean();

    // pivot: { groupName -> { size -> qty } }
    const pivot = {};
    const sizeSet = new Set();

    for (const inv of invoices) {
      for (const li of inv.lineItems || []) {
        // Derive group name: prefer itemData.itemGroupName, then strip size from item name
        const rawName = li.item || "";
        const groupName =
          li.itemData?.itemGroupName ||
          li.itemData?.groupName ||
          // strip trailing "/size" or "-size" pattern
          rawName.replace(/[\s\/\-]+\d+$/, "").trim() ||
          rawName;

        // Derive size
        const size =
          li.size ||
          li.itemData?.size ||
          (() => {
            const m = rawName.match(/[\s\/\-](\d+)$/);
            return m ? m[1] : null;
          })() ||
          "N/A";

        const qty = Number(li.quantity) || 0;
        if (qty === 0) continue;

        if (!pivot[groupName]) pivot[groupName] = {};
        pivot[groupName][size] = (pivot[groupName][size] || 0) + qty;
        sizeSet.add(size);
      }
    }

    // Sort sizes numerically where possible
    const sizes = [...sizeSet].sort((a, b) => {
      const na = Number(a), nb = Number(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });

    // Build rows
    const rows = Object.entries(pivot)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([groupName, sizeCounts]) => ({
        groupName,
        sizes: sizeCounts,
        total: Object.values(sizeCounts).reduce((s, v) => s + v, 0),
      }));

    res.json({ success: true, data: { sizes, rows } });
  } catch (err) {
    console.error("getSalesByGroup error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
