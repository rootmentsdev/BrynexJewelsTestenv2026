import nodemailer from "nodemailer";

// Initialize email transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Send reorder alert email to admin and users
 */
export const sendReorderAlertEmail = async (alert, recipients) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn("⚠️ Email credentials not configured. Skipping email notification.");
      return false;
    }

    if (!recipients || recipients.length === 0) {
      console.warn("⚠️ No recipients provided for reorder alert email");
      return false;
    }

    const emailList = recipients.join(", ");

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">⚠️ Low Stock Alert</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Immediate action required</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
          <h2 style="color: #333; margin-top: 0;">Product Details</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #fff;">
              <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #666; width: 40%;">Product Name:</td>
              <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; color: #333;">${alert.itemName}</td>
            </tr>
            <tr style="background: #fff;">
              <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #666;">SKU:</td>
              <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; color: #333;">${alert.itemSku || "N/A"}</td>
            </tr>
            <tr style="background: #fff;">
              <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #666;">Warehouse:</td>
              <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; color: #333;">${alert.warehouse}</td>
            </tr>
            ${alert.itemGroupName ? `
            <tr style="background: #fff;">
              <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #666;">Item Group:</td>
              <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; color: #333;">${alert.itemGroupName}</td>
            </tr>
            ` : ""}
          </table>

          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: #856404;">Stock Status</h3>
            <p style="margin: 5px 0; color: #856404;">
              <strong>Current Stock:</strong> <span style="font-size: 20px; color: #dc3545;">${alert.currentStock}</span> units
            </p>
            <p style="margin: 5px 0; color: #856404;">
              <strong>Reorder Point:</strong> <span style="font-size: 20px; color: #ffc107;">${alert.reorderPoint}</span> units
            </p>
          </div>

          <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: #2e7d32;">Recommended Action</h3>
            <p style="margin: 0; color: #2e7d32;">
              Please place a purchase order for this product immediately to maintain adequate inventory levels.
            </p>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999;">
            <p style="margin: 0;">Alert ID: ${alert._id}</p>
            <p style="margin: 5px 0 0 0;">Generated: ${new Date(alert.createdAt).toLocaleString()}</p>
          </div>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: emailList,
      subject: `🚨 Low Stock Alert: ${alert.itemName} (${alert.itemSku || "N/A"})`,
      html: htmlContent,
      text: `
Low Stock Alert

Product: ${alert.itemName}
SKU: ${alert.itemSku || "N/A"}
Warehouse: ${alert.warehouse}
${alert.itemGroupName ? `Item Group: ${alert.itemGroupName}\n` : ""}

Current Stock: ${alert.currentStock} units
Reorder Point: ${alert.reorderPoint} units

Please place a purchase order for this product immediately.

Alert ID: ${alert._id}
Generated: ${new Date(alert.createdAt).toLocaleString()}
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Reorder alert email sent successfully. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending reorder alert email:", error);
    return false;
  }
};

/**
 * Send test email to verify configuration
 */
export const sendTestEmail = async (recipientEmail) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      throw new Error("Email credentials not configured");
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: "Test Email - Reorder Alert System",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #4caf50; color: white; padding: 20px; border-radius: 8px;">
            <h1 style="margin: 0;">✅ Email Configuration Successful</h1>
          </div>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
            <p>Your reorder alert email system is configured and working correctly.</p>
            <p>You will receive notifications when products reach their reorder point.</p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Test email sent successfully. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending test email:", error);
    throw error;
  }
};
