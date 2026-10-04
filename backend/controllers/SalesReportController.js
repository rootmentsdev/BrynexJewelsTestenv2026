import SalesInvoice from "../model/SalesInvoice.js";
import User from "../model/UserModel.js";

// Get Sales by Invoice Report (NEW - with advanced filtering)
export const getSalesByInvoice = async (req, res) => {
  try {
    const { dateFrom, dateTo, locCode, category, sku, size, customer } = req.query;
    const userId = req.query.userId || req.body.userId;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ message: "dateFrom and dateTo are required" });
    }

    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    fromDate.setUTCHours(0, 0, 0, 0);
    toDate.setUTCHours(23, 59, 59, 999);

    // Check if user is admin
    const adminEmails = ['officerootments@gmail.com'];
    const isAdminEmail = userId && adminEmails.some(email => userId.toLowerCase() === email.toLowerCase());
    const isAdmin = isAdminEmail || (locCode && (locCode === '858' || locCode === '103'));
    const isClusterManager = req.query.isClusterManager === "true";
    const allowedLocCodes = req.query.allowedLocCodes ? req.query.allowedLocCodes.split(",") : [];

    let query = {
      invoiceDate: { $gte: fromDate, $lte: toDate },
      category: { $ne: "Return" } // Exclude returns from sales
    };

    // Store filtering logic
    if (isClusterManager) {
      if (locCode && locCode !== "all") {
        query.$or = [{ warehouse: locCode }, { branch: locCode }, { locCode: locCode }];
      } else if (allowedLocCodes.length > 0) {
        query.locCode = { $in: allowedLocCodes };
      }
    } else if (!isAdmin && locCode && locCode !== '858' && locCode !== '103' && locCode !== 'all') {
      // For store users, filter by their locCode
      query.$or = [
        { warehouse: locCode },
        { branch: locCode },
        { locCode: locCode }
      ];
    } else if (isAdmin && locCode && locCode !== 'all') {
      // For admin users, filter by selected store if specified
      query.$or = [
        { warehouse: locCode },
        { branch: locCode },
        { locCode: locCode }
      ];
    }

    // Advanced filtering
    if (category) {
      // Combine category filter with existing exclusion of returns
      query.category = { 
        $ne: "Return",
        $regex: new RegExp(category, 'i')
      };
    }

    if (customer) {
      query.customer = new RegExp(customer, 'i');
    }

    let invoices = await SalesInvoice.find(query).sort({ invoiceDate: -1 });

    // Filter by SKU or size if specified (requires checking line items)
    if (sku || size) {
      invoices = invoices.filter(invoice => {
        if (!invoice.lineItems || !Array.isArray(invoice.lineItems)) {
          return false;
        }
        
        const hasMatchingItem = invoice.lineItems.some(item => {
          let matchesSku = true;
          let matchesSize = true;
          
          if (sku) {
            // Check both 'sku' and 'itemSku' fields since the structure may vary
            const itemSku = item.sku || item.itemSku;
            const cleanSku = sku.trim(); // Remove leading/trailing spaces
            matchesSku = itemSku && itemSku.toLowerCase().includes(cleanSku.toLowerCase());
          }
          
          if (size) {
            // Check multiple places for size information:
            // 1. Direct size field
            // 2. ItemData.size field  
            // 3. Item name (e.g., "Last test - black/34")
            // 4. AttributeCombination in itemData
            let sizeFound = false;
            const cleanSize = size.trim(); // Remove leading/trailing spaces
            
            // Check direct size field
            if (item.size && item.size.toString().toLowerCase() === cleanSize.toLowerCase()) {
              sizeFound = true;
            }
            
            // Check itemData.size field
            if (!sizeFound && item.itemData && item.itemData.size && item.itemData.size.toString().toLowerCase() === cleanSize.toLowerCase()) {
              sizeFound = true;
            }
            
            // Check item name for size pattern (e.g., "/34", "-34", " 34")
            if (!sizeFound && item.item) {
              const sizePattern = new RegExp(`[/\\-\\s]${cleanSize}(?:[/\\-\\s]|$)`, 'i');
              sizeFound = sizePattern.test(item.item);
              
              // Also check for exact size match at the end of item name
              if (!sizeFound) {
                const endPattern = new RegExp(`${cleanSize}$`, 'i');
                sizeFound = endPattern.test(item.item);
              }
            }
            
            // Check attributeCombination in itemData
            if (!sizeFound && item.itemData && item.itemData.attributeCombination) {
              sizeFound = item.itemData.attributeCombination.some(attr => 
                attr.toString().toLowerCase() === cleanSize.toLowerCase()
              );
            }
            
            matchesSize = sizeFound;
          }
          
          return matchesSku && matchesSize;
        });
        
        return hasMatchingItem;
      });
    }

    // Calculate summary statistics
    let totalSales = 0;
    let totalItems = 0;
    let totalDiscount = 0;
    let totalPurchaseCost = 0;

    const invoiceNumbers = invoices.map(inv => inv.invoiceNumber);
    const returnInvoices = await SalesInvoice.find({
      $or: [
        { category: "Return" },
        { invoiceNumber: { $regex: /^(RTN|RET)/i } },
        { returnStatus: { $in: ["partial", "full", "Partial", "Full"] } }
      ]
    }).lean();

    const returnedInvoiceNums = new Set();
    returnInvoices.forEach(r => {
      if (r.originalInvoiceNumber) {
        returnedInvoiceNums.add(r.originalInvoiceNumber.trim());
      }
      if (r.invoiceNumber) {
        const stripped = r.invoiceNumber.replace(/^(RTN|RET)[-_]?/i, '').trim();
        if (stripped) {
          returnedInvoiceNums.add(stripped);
          if (!stripped.toUpperCase().startsWith('INV-')) {
            returnedInvoiceNums.add(`INV-${stripped}`);
          }
        }
      }
      const combinedNotes = `${r.customerNotes || ''} ${r.notes || ''} ${r.remark || ''}`;
      invoiceNumbers.forEach(invNum => {
        if (invNum && combinedNotes.includes(invNum)) {
          returnedInvoiceNums.add(invNum);
        }
      });
    });

    const processedInvoices = invoices.map(invoice => {
      // Filter line items to only include matching items (for SKU/size filters)
      let relevantItems = invoice.lineItems || [];
      
      if (sku || size) {
        relevantItems = relevantItems.filter(item => {
          let matchesSku = true;
          let matchesSize = true;
          
          if (sku) {
            const itemSku = item.sku || item.itemSku;
            const cleanSku = sku.trim(); // Remove leading/trailing spaces
            matchesSku = itemSku && itemSku.toLowerCase().includes(cleanSku.toLowerCase());
          }
          
          if (size) {
            let sizeFound = false;
            const cleanSize = size.trim();
            
            if (item.size && item.size.toString().toLowerCase() === cleanSize.toLowerCase()) {
              sizeFound = true;
            }
            if (!sizeFound && item.itemData && item.itemData.size && item.itemData.size.toString().toLowerCase() === cleanSize.toLowerCase()) {
              sizeFound = true;
            }
            if (!sizeFound && item.item) {
              const sizePattern = new RegExp(`[/\\-\\s]${cleanSize}(?:[/\\-\\s]|$)`, 'i');
              sizeFound = sizePattern.test(item.item);
              if (!sizeFound) {
                const endPattern = new RegExp(`${cleanSize}$`, 'i');
                sizeFound = endPattern.test(item.item);
              }
            }
            if (!sizeFound && item.itemData && item.itemData.attributeCombination) {
              sizeFound = item.itemData.attributeCombination.some(attr => 
                attr.toString().toLowerCase() === cleanSize.toLowerCase()
              );
            }
            matchesSize = sizeFound;
          }
          
          return matchesSku && matchesSize;
        });
      }
      
      // Calculate amounts based only on relevant items
      const itemCount = relevantItems.length;
      let itemAmount = 0;
      let itemDiscount = 0;
      let itemPurchaseCost = 0;
      let uniqueSkus = [];
      
      if (sku || size) {
        itemAmount = relevantItems.reduce((sum, item) => {
          return sum + (parseFloat(item.amount) || 0);
        }, 0);
        
        itemPurchaseCost = relevantItems.reduce((sum, item) => {
          const quantity = parseFloat(item.quantity) || 0;
          const purchasePrice = parseFloat(item.itemData?.costPrice || 0);
          return sum + (quantity * purchasePrice);
        }, 0);
        
        const totalInvoiceAmount = parseFloat(invoice.finalTotal) || 0;
        const totalInvoiceDiscount = parseFloat(invoice.discountAmount) || 0;
        
        if (totalInvoiceAmount > 0 && totalInvoiceDiscount > 0) {
          itemDiscount = (itemAmount / totalInvoiceAmount) * totalInvoiceDiscount;
        }
        
        const skus = relevantItems.map(item => item.sku || item.itemSku).filter(Boolean);
        uniqueSkus = [...new Set(skus)];
      } else {
        itemAmount = parseFloat(invoice.finalTotal) || 0;
        itemDiscount = parseFloat(invoice.discountAmount) || 0;
        
        itemPurchaseCost = (invoice.lineItems || []).reduce((sum, item) => {
          const quantity = parseFloat(item.quantity) || 0;
          const purchasePrice = parseFloat(item.itemData?.costPrice || 0);
          return sum + (quantity * purchasePrice);
        }, 0);
        
        const allSkus = (invoice.lineItems || []).map(item => item.sku || item.itemSku).filter(Boolean);
        uniqueSkus = [...new Set(allSkus)];
      }

      const hasReturnRecord = returnedInvoiceNums.has(invoice.invoiceNumber);
      const rawReturnStatus = (invoice.returnStatus || "").toString().toLowerCase().trim();
      const hasExplicitReturnStatus = rawReturnStatus !== "" && rawReturnStatus !== "none";
      const isReturnCategory = (invoice.category || "").toString().toLowerCase() === "return";

      const isReturned = hasExplicitReturnStatus || hasReturnRecord || isReturnCategory;
      const returnStatus = hasExplicitReturnStatus
        ? rawReturnStatus
        : (hasReturnRecord || isReturnCategory)
        ? "full"
        : "none";

      if (!isReturned) {
        totalSales += itemAmount;
        totalDiscount += itemDiscount;
        totalItems += itemCount;
        totalPurchaseCost += itemPurchaseCost;
      }

      return {
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.invoiceDate?.toISOString().split('T')[0] || '',
        customer: invoice.customer || 'Unknown',
        category: invoice.category || 'General',
        skus: uniqueSkus.join(', ') || 'N/A',
        itemCount: itemCount,
        totalAmount: itemAmount,
        discount: itemDiscount,
        purchaseCost: itemPurchaseCost,
        netAmount: itemAmount - itemDiscount,
        profit: (itemAmount - itemDiscount) - itemPurchaseCost,
        paymentMethod: invoice.paymentMethod || 'Cash',
        branch: invoice.branch || invoice.warehouse || invoice.locCode || 'Unknown',
        salesPerson: invoice.salesperson || 'N/A',
        returnStatus: returnStatus,
        isReturned: isReturned
      };
    });

    const activeInvoicesCount = processedInvoices.filter(inv => !inv.isReturned).length;
    const avgInvoiceValue = activeInvoicesCount > 0 ? totalSales / activeInvoicesCount : 0;
    const totalProfit = (totalSales - totalDiscount) - totalPurchaseCost;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          dateFrom,
          dateTo,
          totalInvoices: activeInvoicesCount,
          totalAllInvoices: processedInvoices.length,
          totalSales,
          totalItems,
          totalDiscount,
          totalPurchaseCost,
          totalProfit,
          netSales: totalSales - totalDiscount,
          avgInvoiceValue
        },
        invoices: processedInvoices
      }
    });
  } catch (error) {
    console.error("Get sales by invoice error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Sales Summary Report
export const getSalesSummary = async (req, res) => {
  try {
    const { dateFrom, dateTo, locCode, warehouse } = req.query;
    const userId = req.query.userId || req.body.userId;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ message: "dateFrom and dateTo are required" });
    }

    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    fromDate.setUTCHours(0, 0, 0, 0);
    toDate.setUTCHours(23, 59, 59, 999);

    // Check if user is admin
    const adminEmails = ['officerootments@gmail.com'];
    const isAdminEmail = userId && adminEmails.some(email => userId.toLowerCase() === email.toLowerCase());
    const isAdmin = isAdminEmail || (locCode && (locCode === '858' || locCode === '103'));

    let query = {
      invoiceDate: { $gte: fromDate, $lte: toDate },
      category: { $ne: "Return" } // Exclude returns from sales
    };

    // For store users (non-admin), filter by their locCode
    if (!isAdmin && locCode && locCode !== '858' && locCode !== '103' && locCode !== 'all') {
      query.$or = [
        { warehouse: locCode },
        { branch: locCode },
        { locCode: locCode }
      ];
    }
    // For admin users, filter by selected store if specified and not "all"
    else if (isAdmin && locCode && locCode !== 'all' && locCode !== '858' && locCode !== '103') {
      query.$or = [
        { warehouse: locCode },
        { branch: locCode },
        { locCode: locCode }
      ];
    }
    // Legacy support: also check warehouse parameter
    else if (isAdmin && warehouse && warehouse !== "All Stores") {
      query.$or = [
        { warehouse: warehouse },
        { branch: warehouse },
        { locCode: warehouse }
      ];
    }

    const invoices = await SalesInvoice.find(query).sort({ invoiceDate: -1 });

    // Calculate totals
    let totalSales = 0;
    let totalDiscount = 0;
    let totalCash = 0;
    let totalBank = 0;
    let totalUPI = 0;
    let totalRBL = 0;
    let invoiceCount = 0;

    const salesByCategory = {};
    const salesBySalesPerson = {};

    invoices.forEach(invoice => {
      const amount = parseFloat(invoice.finalTotal) || 0;
      const discount = parseFloat(invoice.discountAmount) || 0;
      
      // Handle both single payment method (string) and split payments (array)
      const paymentMethods = Array.isArray(invoice.paymentMethod) 
        ? invoice.paymentMethod 
        : [invoice.paymentMethod];
      
      // For split payments, divide amount equally among payment methods
      const amountPerMethod = amount / paymentMethods.length;
      
      // Count each payment method
      paymentMethods.forEach(method => {
        const normalizedMethod = (method || "Cash").toString().trim();
        
        if (normalizedMethod.toLowerCase() === "cash") {
          totalCash += amountPerMethod;
        } else if (normalizedMethod.toLowerCase() === "bank") {
          totalBank += amountPerMethod;
        } else if (normalizedMethod.toLowerCase() === "upi") {
          totalUPI += amountPerMethod;
        } else if (normalizedMethod.toLowerCase() === "rbl") {
          totalRBL += amountPerMethod;
        } else {
          // Default to cash for unknown payment methods
          totalCash += amountPerMethod;
        }
      });

      totalSales += amount;
      totalDiscount += discount;
      invoiceCount++;

      // Group by category
      const category = invoice.category || "General";
      if (!salesByCategory[category]) {
        salesByCategory[category] = { count: 0, amount: 0 };
      }
      salesByCategory[category].count++;
      salesByCategory[category].amount += amount;

      // Group by sales person AND store (to handle same name in different stores)
      const salesPerson = invoice.salesperson || "Unknown";
      const branch = invoice.branch || invoice.warehouse || invoice.locCode || "Unknown";
      const salesPersonKey = `${salesPerson}_${branch}`; // Unique key per person per store
      if (!salesBySalesPerson[salesPersonKey]) {
        salesBySalesPerson[salesPersonKey] = { 
          count: 0, 
          amount: 0, 
          branch: branch,
          name: salesPerson
        };
      }
      salesBySalesPerson[salesPersonKey].count++;
      salesBySalesPerson[salesPersonKey].amount += amount;
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          dateFrom,
          dateTo,
          totalInvoices: invoiceCount,
          totalSales,
          totalDiscount,
          netSales: totalSales - totalDiscount,
          paymentBreakdown: {
            cash: totalCash,
            bank: totalBank,
            upi: totalUPI,
            rbl: totalRBL
          }
        },
        salesByCategory: Object.entries(salesByCategory).map(([category, data]) => ({
          category,
          ...data
        })),
        topSalesPersons: Object.entries(salesBySalesPerson)
          .map(([salesPerson, data]) => ({ 
            name: data.name,
            count: data.count,
            amount: data.amount,
            store: data.branch
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 10),
        invoices: invoices.map(inv => ({
          invoiceNumber: inv.invoiceNumber,
          date: inv.invoiceDate,
          customer: inv.customer,
          category: inv.category,
          amount: inv.finalTotal,
          discount: inv.discountAmount,
          paymentMethod: inv.paymentMethod,
          branch: inv.branch || inv.warehouse
        }))
      }
    });
  } catch (error) {
    console.error("Get sales summary error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Sales by Item Report (Enhanced with filtering)
export const getSalesByItem = async (req, res) => {
  try {
    const { dateFrom, dateTo, locCode, category, sku, size, customer } = req.query;
    const userId = req.query.userId || req.body.userId;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ message: "dateFrom and dateTo are required" });
    }

    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    fromDate.setUTCHours(0, 0, 0, 0);
    toDate.setUTCHours(23, 59, 59, 999);

    // Check if user is admin
    const adminEmails = ['officerootments@gmail.com'];
    const isAdminEmail = userId && adminEmails.some(email => userId.toLowerCase() === email.toLowerCase());
    const isAdmin = isAdminEmail || (locCode && (locCode === '858' || locCode === '103'));

    let query = {
      invoiceDate: { $gte: fromDate, $lte: toDate },
      category: { $ne: "Return" }
    };

    // Store filtering logic
    if (!isAdmin && locCode && locCode !== '858' && locCode !== '103' && locCode !== 'all') {
      query.$or = [
        { warehouse: locCode },
        { branch: locCode },
        { locCode: locCode }
      ];
    } else if (isAdmin && locCode && locCode !== 'all') {
      query.$or = [
        { warehouse: locCode },
        { branch: locCode },
        { locCode: locCode }
      ];
    }

    // Advanced filtering
    if (category) {
      query.category = new RegExp(category, 'i');
    }

    if (customer) {
      query.customer = new RegExp(customer, 'i');
    }

    const invoices = await SalesInvoice.find(query);

    const itemSales = {};

    invoices.forEach(invoice => {
      if (invoice.lineItems && Array.isArray(invoice.lineItems)) {
        invoice.lineItems.forEach(item => {
          // Apply SKU and size filters
          let includeItem = true;
          
          if (sku) {
            const itemSku = item.sku || item.itemSku;
            const cleanSku = sku.trim(); // Remove leading/trailing spaces
            if (!itemSku || !itemSku.toLowerCase().includes(cleanSku.toLowerCase())) {
              includeItem = false;
            }
          }
          
          if (size) {
            // Check multiple places for size information:
            // 1. Direct size field
            // 2. Item name (e.g., "Last test - black/34")
            // 3. AttributeCombination in itemData
            let sizeFound = false;
            
            // Check direct size field
            if (item.size && item.size.toString().toLowerCase() === size.toLowerCase()) {
              sizeFound = true;
            }
            
            // Check itemData.size field
            if (!sizeFound && item.itemData && item.itemData.size && item.itemData.size.toString().toLowerCase() === size.toLowerCase()) {
              sizeFound = true;
            }
            
            // Check item name for size pattern (e.g., "/34", "-34", " 34")
            if (!sizeFound && item.item) {
              const sizePattern = new RegExp(`[/\\-\\s]${size}(?:[/\\-\\s]|$)`, 'i');
              sizeFound = sizePattern.test(item.item);
              
              // Also check for exact size match at the end of item name
              if (!sizeFound) {
                const endPattern = new RegExp(`${size}$`, 'i');
                sizeFound = endPattern.test(item.item);
              }
            }
            
            // Check attributeCombination in itemData
            if (!sizeFound && item.itemData && item.itemData.attributeCombination) {
              sizeFound = item.itemData.attributeCombination.some(attr => 
                attr.toString().toLowerCase() === size.toLowerCase()
              );
            }
            
            if (!sizeFound) {
              includeItem = false;
            }
          }
          
          if (!includeItem) return;

          const itemSku = item.sku || item.itemSku || "";
          const itemSize = item.size || item.itemData?.size || "";
          // Resolve item name - fall back to itemData if item.item looks like a MongoDB ObjectID
          const isObjectId = (val) => typeof val === 'string' && /^[a-f0-9]{24}$/i.test(val);
          const rawName = item.name || item.itemName || item.item;
          const itemName = (rawName && !isObjectId(rawName))
            ? rawName
            : (item.itemData?.itemName || item.itemData?.name || "Unknown");
          const itemKey = `${itemName}_${itemSku}_${itemSize}`;
          const quantity = parseFloat(item.quantity) || 0;
          const price = parseFloat(item.price || item.rate) || 0;
          const amount = quantity * price;

          if (!itemSales[itemKey]) {
            itemSales[itemKey] = {
              name: itemName,
              sku: itemSku,
              category: item.category || invoice.category || "General",
              size: itemSize || "N/A",
              quantity: 0,
              unitPrice: price,
              totalAmount: 0,
              invoiceCount: 0
            };
          }
          itemSales[itemKey].quantity += quantity;
          itemSales[itemKey].totalAmount += amount;
          itemSales[itemKey].invoiceCount++;
        });
      }
    });

    const itemList = Object.values(itemSales)
      .sort((a, b) => b.totalAmount - a.totalAmount);

    res.status(200).json({
      success: true,
      data: {
        dateFrom,
        dateTo,
        items: itemList,
        totalItems: itemList.length,
        totalQuantity: itemList.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount: itemList.reduce((sum, item) => sum + item.totalAmount, 0)
      }
    });
  } catch (error) {
    console.error("Get sales by item error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Sales Return Summary
export const getSalesReturnSummary = async (req, res) => {
  try {
    const { dateFrom, dateTo, locCode } = req.query;
    const userId = req.query.userId || req.body.userId;

    console.log("\n=== RETURN SUMMARY REQUEST ===");
    console.log("locCode received:", locCode);
    console.log("locCode type:", typeof locCode);

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ message: "dateFrom and dateTo are required" });
    }

    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    fromDate.setUTCHours(0, 0, 0, 0);
    toDate.setUTCHours(23, 59, 59, 999);

    let query;
    
    // Filter by store if locCode is provided and not "all"
    if (locCode && locCode !== "all") {
      console.log("✅ APPLYING STORE FILTER for locCode:", locCode);
      query = {
        invoiceDate: { $gte: fromDate, $lte: toDate },
        category: "Return",
        $or: [
          { warehouse: locCode },
          { branch: locCode },
          { locCode: locCode }
        ]
      };
    } else {
      console.log("❌ NO STORE FILTER - returning all");
      query = {
        invoiceDate: { $gte: fromDate, $lte: toDate },
        category: "Return"
      };
    }
    
    const returns = await SalesInvoice.find(query).sort({ invoiceDate: -1 });
    console.log("Returns found:", returns.length);

    let totalReturns = 0;
    let totalReturnAmount = 0;
    const returnsByReason = {};

    returns.forEach(ret => {
      const amount = Math.abs(parseFloat(ret.finalTotal)) || 0;
      totalReturns++;
      totalReturnAmount += amount;

      const reason = ret.remark || "No reason provided";
      if (!returnsByReason[reason]) {
        returnsByReason[reason] = { count: 0, amount: 0 };
      }
      returnsByReason[reason].count++;
      returnsByReason[reason].amount += amount;
    });

    res.status(200).json({
      success: true,
      data: {
        dateFrom,
        dateTo,
        summary: {
          totalReturns,
          totalReturnAmount,
          averageReturnAmount: totalReturns > 0 ? totalReturnAmount / totalReturns : 0
        },
        returnsByReason: Object.entries(returnsByReason).map(([reason, data]) => ({
          reason,
          ...data
        })),
        returns: returns.map(ret => ({
          invoiceNumber: ret.invoiceNumber,
          date: ret.invoiceDate,
          customer: ret.customer,
          amount: Math.abs(ret.finalTotal),
          reason: ret.remark,
          branch: ret.branch || ret.warehouse,
          warehouse: ret.warehouse,
          locCode: ret.locCode
        }))
      }
    });
  } catch (error) {
    console.error("❌ Get sales return summary error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
