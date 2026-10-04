import express from "express";
import ReorderAlert from "../model/ReorderAlert.js";
import { getActiveReorderAlerts, markAlertAsNotified, resolveReorderAlert } from "../utils/reorderNotification.js";
import { sendTestEmail } from "../utils/emailService.js";

const router = express.Router();

// Get all active reorder alerts
router.get("/reorder-alerts", async (req, res) => {
  try {
    const { warehouse, status } = req.query;
    
    const query = {};
    if (warehouse) query.warehouse = warehouse;
    if (status) query.status = status;
    else query.status = "active"; // Default to active alerts

    const alerts = await ReorderAlert.find(query).sort({ createdAt: -1 });
    res.status(200).json(alerts);
  } catch (error) {
    console.error("Error fetching reorder alerts:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get reorder alerts for a specific warehouse
router.get("/reorder-alerts/warehouse/:warehouse", async (req, res) => {
  try {
    const { warehouse } = req.params;
    const alerts = await getActiveReorderAlerts(warehouse);
    res.status(200).json(alerts);
  } catch (error) {
    console.error("Error fetching warehouse alerts:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Mark alert as notified
router.put("/reorder-alerts/:id/notify", async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await markAlertAsNotified(id);
    res.status(200).json(alert);
  } catch (error) {
    console.error("Error marking alert as notified:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Resolve alert
router.put("/reorder-alerts/:id/resolve", async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await resolveReorderAlert(id);
    res.status(200).json(alert);
  } catch (error) {
    console.error("Error resolving alert:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete alert
router.delete("/reorder-alerts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await ReorderAlert.findByIdAndDelete(id);
    res.status(200).json({ message: "Alert deleted successfully" });
  } catch (error) {
    console.error("Error deleting alert:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Test email configuration
router.post("/reorder-alerts/test-email", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email address is required" });
    }

    await sendTestEmail(email);
    res.status(200).json({ 
      message: "Test email sent successfully",
      email: email
    });
  } catch (error) {
    console.error("Error sending test email:", error);
    res.status(500).json({ 
      message: "Failed to send test email",
      error: error.message,
      hint: "Please check your email configuration in .env file"
    });
  }
});

export default router;
