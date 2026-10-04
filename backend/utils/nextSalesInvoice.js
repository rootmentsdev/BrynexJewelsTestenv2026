// backend/utils/nextSalesInvoice.js
import SalesInvoice from "../model/SalesInvoice.js";

export async function nextSalesInvoice(locCode, prefix = "INV-") {
  try {
    // Find the latest invoice number for this location with the given prefix
    const latestInvoice = await SalesInvoice.findOne({
      locCode: locCode,
      invoiceNumber: { $regex: `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` }
    }).sort({ createdAt: -1 });

    let nextNumber = 1;
    
    if (latestInvoice && latestInvoice.invoiceNumber) {
      // Extract number from the latest invoice number
      const numberPart = latestInvoice.invoiceNumber.replace(prefix, "");
      const currentNumber = parseInt(numberPart, 10);
      
      if (!isNaN(currentNumber)) {
        nextNumber = currentNumber + 1;
      }
    }

    // Format with leading zeros (6 digits)
    const formattedNumber = nextNumber.toString().padStart(6, '0');
    return `${prefix}${formattedNumber}`;
    
  } catch (error) {
    console.error("Error generating next sales invoice number:", error);
    // Fallback to timestamp-based number
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}${timestamp}`;
  }
}

// Generate unique invoice number globally (across all locations)
export async function nextGlobalSalesInvoice(prefix = "INV-") {
  try {
    // Find the latest invoice number globally with the given prefix
    const latestInvoice = await SalesInvoice.findOne({
      invoiceNumber: { $regex: `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` }
    }).sort({ createdAt: -1 });

    let nextNumber = 1;
    
    if (latestInvoice && latestInvoice.invoiceNumber) {
      // Extract number from the latest invoice number
      const numberPart = latestInvoice.invoiceNumber.replace(prefix, "");
      const currentNumber = parseInt(numberPart, 10);
      
      if (!isNaN(currentNumber)) {
        nextNumber = currentNumber + 1;
      }
    }

    // Format with leading zeros (6 digits)
    const formattedNumber = nextNumber.toString().padStart(6, '0');
    return `${prefix}${formattedNumber}`;
    
  } catch (error) {
    console.error("Error generating next global sales invoice number:", error);
    // Fallback to timestamp-based number
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}${timestamp}`;
  }
}
