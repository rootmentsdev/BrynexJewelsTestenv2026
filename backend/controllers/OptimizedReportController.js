import mongoose from 'mongoose';
import Transaction from '../model/Transaction.js';
import ShoeItem from '../model/ShoeItem.js';
import SalesInvoice from '../model/SalesInvoice.js';
import NodeCache from 'node-cache';

// Cache for 5 minutes (300 seconds)
const cache = new NodeCache({ stdTTL: 300 });

// Cache utility functions
const getCachedData = (key) => cache.get(key);
const setCachedData = (key, data, ttl = 300) => cache.set(key, data, ttl);
const generateCacheKey = (prefix, params) => `${prefix}:${JSON.stringify(params)}`;

/**
 * Optimized Financial Summary Report
 * Uses MongoDB aggregation pipeline for better performance
 */
export const getOptimizedFinancialSummary = async (req, res) => {
  const { fromDate, toDate, locCode, category = 'all', subCategory = 'all' } = req.query;
  
  try {
    // Check cache first
    const cacheKey = generateCacheKey('financial_summary', { fromDate, toDate, locCode, category, subCategory });
    const cached = getCachedData(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    // Build match conditions
    const matchConditions = {
      locCode: locCode,
      date: {
        $gte: new Date(fromDate),
        $lte: new Date(toDate)
      }
    };

    if (category !== 'all') {
      matchConditions.category = category;
    }
    if (subCategory !== 'all') {
      matchConditions.subCategory = subCategory;
    }

    // Aggregation pipeline for transactions
    const pipeline = [
      // Stage 1: Match documents
      { $match: matchConditions },
      
      // Stage 2: Add calculated fields
      {
        $addFields: {
          totalAmount: { $add: ["$cash", "$rbl", "$bank", "$upi"] }
        }
      },
      
      // Stage 3: Group by category and type
      {
        $group: {
          _id: {
            category: "$category",
            type: "$type",
            subCategory: "$subCategory"
          },
          totalCash: { $sum: "$cash" },
          totalRbl: { $sum: "$rbl" },
          totalBank: { $sum: "$bank" },
          totalUpi: { $sum: "$upi" },
          totalAmount: { $sum: "$totalAmount" },
          count: { $sum: 1 },
          transactions: { 
            $push: {
              _id: "$_id",
              invoiceNo: "$invoiceNo",
              customerName: "$customerName",
              date: "$date",
              cash: "$cash",
              rbl: "$rbl",
              bank: "$bank",
              upi: "$upi",
              amount: "$amount",
              billValue: "$billValue"
            }
          }
        }
      },
      
      // Stage 4: Sort results
      {
        $sort: { 
          "_id.category": 1, 
          "_id.type": 1,
          "_id.subCategory": 1
        }
      }
    ];

    // Execute aggregation
    const [summaryResults, openingBalance] = await Promise.all([
      Transaction.aggregate(pipeline),
      getOpeningBalance(locCode, fromDate)
    ]);

    // Calculate grand totals
    const grandTotals = summaryResults.reduce((acc, group) => ({
      cash: acc.cash + group.totalCash,
      rbl: acc.rbl + group.totalRbl,
      bank: acc.bank + group.totalBank,
      upi: acc.upi + group.totalUpi,
      amount: acc.amount + group.totalAmount,
      count: acc.count + group.count
    }), { cash: 0, rbl: 0, bank: 0, upi: 0, amount: 0, count: 0 });

    // Add opening balance to totals
    const finalTotals = {
      cash: grandTotals.cash + openingBalance.cash,
      rbl: grandTotals.rbl + openingBalance.rbl,
      bank: grandTotals.bank,
      upi: grandTotals.upi,
      amount: grandTotals.amount + openingBalance.cash + openingBalance.rbl,
      count: grandTotals.count
    };

    const result = {
      success: true,
      data: {
        summary: summaryResults,
        totals: finalTotals,
        openingBalance,
        period: { fromDate, toDate },
        filters: { category, subCategory },
        performance: {
          queryTime: Date.now(),
          recordsProcessed: grandTotals.count
        }
      }
    };

    // Cache the result
    setCachedData(cacheKey, result, 300); // 5 minutes

    res.json(result);

  } catch (error) {
    console.error('Error in optimized financial summary:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Get opening balance for a specific date and location
 */
const getOpeningBalance = async (locCode, fromDate) => {
  try {
    // Get previous day
    const previousDate = new Date(fromDate);
    previousDate.setDate(previousDate.getDate() - 1);
    const prevDateStr = previousDate.toISOString().split('T')[0];

    // Try to get from closing collection first
    const Closing = mongoose.model('Closing');
    const closing = await Closing.findOne({
      locCode: locCode,
      date: prevDateStr
    }).sort({ createdAt: -1 });

    if (closing) {
      return {
        cash: closing.cash || 0,
        rbl: closing.rbl || 0
      };
    }

    // Fallback: calculate from transactions
    const pipeline = [
      {
        $match: {
          locCode: locCode,
          date: { $lt: new Date(fromDate) }
        }
      },
      {
        $group: {
          _id: null,
          totalCash: { $sum: "$cash" },
          totalRbl: { $sum: "$rbl" }
        }
      }
    ];

    const result = await Transaction.aggregate(pipeline);
    
    return result.length > 0 
      ? { cash: result[0].totalCash, rbl: result[0].totalRbl }
      : { cash: 0, rbl: 0 };

  } catch (error) {
    console.error('Error getting opening balance:', error);
    return { cash: 0, rbl: 0 };
  }
};

/**
 * Optimized Inventory Report
 * Uses aggregation for better performance with large datasets
 */
export const getOptimizedInventoryReport = async (req, res) => {
  const { warehouse, category = 'all', stockFilter = 'all' } = req.query;
  
  try {
    // Check cache
    const cacheKey = generateCacheKey('inventory_report', { warehouse, category, stockFilter });
    const cached = getCachedData(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    // Build match conditions
    const matchConditions = { isActive: true };
    
    if (warehouse && warehouse !== 'all') {
      matchConditions['warehouseStocks.warehouse'] = warehouse;
    }

    // Aggregation pipeline
    const pipeline = [
      { $match: matchConditions },
      
      // Unwind warehouse stocks for filtering
      { $unwind: { path: "$warehouseStocks", preserveNullAndEmptyArrays: true } },
      
      // Filter by warehouse if specified
      ...(warehouse && warehouse !== 'all' ? [
        { $match: { "warehouseStocks.warehouse": warehouse } }
      ] : []),
      
      // Add calculated fields
      {
        $addFields: {
          stockValue: { 
            $multiply: ["$warehouseStocks.stockOnHand", "$costPrice"] 
          },
          stockStatus: {
            $cond: {
              if: { $gt: ["$warehouseStocks.stockOnHand", 0] },
              then: "In Stock",
              else: "Out of Stock"
            }
          }
        }
      },
      
      // Filter by stock status if specified
      ...(stockFilter !== 'all' ? [
        { $match: { stockStatus: stockFilter === 'instock' ? 'In Stock' : 'Out of Stock' } }
      ] : []),
      
      // Group back by item
      {
        $group: {
          _id: "$_id",
          itemName: { $first: "$itemName" },
          sku: { $first: "$sku" },
          sellingPrice: { $first: "$sellingPrice" },
          costPrice: { $first: "$costPrice" },
          warehouseStocks: { $push: "$warehouseStocks" },
          totalStockValue: { $sum: "$stockValue" },
          totalStock: { $sum: "$warehouseStocks.stockOnHand" }
        }
      },
      
      // Sort by total stock value (highest first)
      { $sort: { totalStockValue: -1 } }
    ];

    const items = await ShoeItem.aggregate(pipeline);

    // Calculate summary statistics
    const summary = {
      totalItems: items.length,
      totalStockValue: items.reduce((sum, item) => sum + item.totalStockValue, 0),
      totalUnits: items.reduce((sum, item) => sum + item.totalStock, 0),
      inStockItems: items.filter(item => item.totalStock > 0).length,
      outOfStockItems: items.filter(item => item.totalStock === 0).length
    };

    const result = {
      success: true,
      data: {
        items,
        summary,
        filters: { warehouse, category, stockFilter }
      }
    };

    // Cache for 2 minutes (inventory changes frequently)
    setCachedData(cacheKey, result, 120);

    res.json(result);

  } catch (error) {
    console.error('Error in optimized inventory report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Optimized Sales Report
 * Uses aggregation for sales analytics
 */
export const getOptimizedSalesReport = async (req, res) => {
  const { fromDate, toDate, locCode, groupBy = 'day' } = req.query;
  
  try {
    // Check cache
    const cacheKey = generateCacheKey('sales_report', { fromDate, toDate, locCode, groupBy });
    const cached = getCachedData(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    // Build date grouping based on groupBy parameter
    let dateGrouping;
    switch (groupBy) {
      case 'hour':
        dateGrouping = {
          year: { $year: "$invoiceDate" },
          month: { $month: "$invoiceDate" },
          day: { $dayOfMonth: "$invoiceDate" },
          hour: { $hour: "$invoiceDate" }
        };
        break;
      case 'week':
        dateGrouping = {
          year: { $year: "$invoiceDate" },
          week: { $week: "$invoiceDate" }
        };
        break;
      case 'month':
        dateGrouping = {
          year: { $year: "$invoiceDate" },
          month: { $month: "$invoiceDate" }
        };
        break;
      default: // day
        dateGrouping = {
          year: { $year: "$invoiceDate" },
          month: { $month: "$invoiceDate" },
          day: { $dayOfMonth: "$invoiceDate" }
        };
    }

    const pipeline = [
      // Match invoices in date range and location
      {
        $match: {
          locCode: locCode,
          invoiceDate: {
            $gte: new Date(fromDate),
            $lte: new Date(toDate)
          },
          status: { $ne: 'draft' }
        }
      },
      
      // Group by date period
      {
        $group: {
          _id: dateGrouping,
          totalSales: { $sum: "$finalTotal" },
          totalInvoices: { $sum: 1 },
          averageInvoiceValue: { $avg: "$finalTotal" },
          totalTax: { $sum: "$totalTax" },
          totalDiscount: { $sum: "$discountAmount" },
          invoices: {
            $push: {
              invoiceNumber: "$invoiceNumber",
              customer: "$customer",
              finalTotal: "$finalTotal",
              status: "$status"
            }
          }
        }
      },
      
      // Sort by date
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } }
    ];

    const salesData = await SalesInvoice.aggregate(pipeline);

    // Calculate totals
    const totals = salesData.reduce((acc, period) => ({
      totalSales: acc.totalSales + period.totalSales,
      totalInvoices: acc.totalInvoices + period.totalInvoices,
      totalTax: acc.totalTax + period.totalTax,
      totalDiscount: acc.totalDiscount + period.totalDiscount
    }), { totalSales: 0, totalInvoices: 0, totalTax: 0, totalDiscount: 0 });

    const result = {
      success: true,
      data: {
        salesData,
        totals,
        period: { fromDate, toDate },
        groupBy
      }
    };

    // Cache for 10 minutes
    setCachedData(cacheKey, result, 600);

    res.json(result);

  } catch (error) {
    console.error('Error in optimized sales report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Clear cache for specific patterns
 */
export const clearReportCache = async (req, res) => {
  try {
    const { pattern } = req.query;
    
    if (pattern) {
      // Clear specific pattern
      const keys = cache.keys();
      const matchingKeys = keys.filter(key => key.includes(pattern));
      matchingKeys.forEach(key => cache.del(key));
      
      res.json({ 
        success: true, 
        message: `Cleared ${matchingKeys.length} cache entries matching pattern: ${pattern}` 
      });
    } else {
      // Clear all cache
      cache.flushAll();
      res.json({ success: true, message: 'All cache cleared' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = async (req, res) => {
  try {
    const stats = cache.getStats();
    res.json({
      success: true,
      stats: {
        keys: stats.keys,
        hits: stats.hits,
        misses: stats.misses,
        hitRate: stats.hits / (stats.hits + stats.misses) * 100,
        vsize: stats.vsize,
        ksize: stats.ksize
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};