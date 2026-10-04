#!/usr/bin/env node

/**
 * Data Type Optimization Script
 * Converts string numbers to actual numbers for better performance
 * 
 * Usage: node backend/scripts/optimize-data-types.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const optimizeDataTypes = async () => {
  try {
    console.log('🚀 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    console.log('\n🔄 Starting data type optimization...\n');

    // 1. Optimize Transaction Collection
    console.log('1️⃣ Optimizing Transaction collection...');
    
    const transactionCollection = db.collection('transactions');
    
    // Find transactions with string numbers
    const transactionsToUpdate = await transactionCollection.find({
      $or: [
        { cash: { $type: "string" } },
        { bank: { $type: "string" } },
        { upi: { $type: "string" } },
        { rbl: { $type: "string" } },
        { amount: { $type: "string" } }
      ]
    }).toArray();

    console.log(`   Found ${transactionsToUpdate.length} transactions to optimize`);

    let transactionUpdated = 0;
    const batchSize = 100;

    for (let i = 0; i < transactionsToUpdate.length; i += batchSize) {
      const batch = transactionsToUpdate.slice(i, i + batchSize);
      const bulkOps = [];

      for (const transaction of batch) {
        const updates = {};
        
        // Convert string numbers to actual numbers
        if (typeof transaction.cash === 'string') {
          updates.cash = parseFloat(transaction.cash) || 0;
        }
        if (typeof transaction.bank === 'string') {
          updates.bank = parseFloat(transaction.bank) || 0;
        }
        if (typeof transaction.upi === 'string') {
          updates.upi = parseFloat(transaction.upi) || 0;
        }
        if (typeof transaction.rbl === 'string') {
          updates.rbl = parseFloat(transaction.rbl) || 0;
        }
        if (typeof transaction.amount === 'string') {
          updates.amount = parseFloat(transaction.amount) || 0;
        }

        if (Object.keys(updates).length > 0) {
          bulkOps.push({
            updateOne: {
              filter: { _id: transaction._id },
              update: { $set: updates }
            }
          });
        }
      }

      if (bulkOps.length > 0) {
        await transactionCollection.bulkWrite(bulkOps);
        transactionUpdated += bulkOps.length;
        console.log(`   ✅ Updated batch ${Math.ceil((i + batchSize) / batchSize)} (${transactionUpdated} total)`);
      }
    }

    console.log(`   ✅ Optimized ${transactionUpdated} transactions`);

    // 2. Optimize ShoeItem Collection
    console.log('\n2️⃣ Optimizing ShoeItem collection...');
    
    const shoeItemCollection = db.collection('shoeitems');
    
    // Find items with string numbers in warehouse stocks
    const itemsToUpdate = await shoeItemCollection.find({
      $or: [
        { "warehouseStocks.stockOnHand": { $type: "string" } },
        { "warehouseStocks.availableForSale": { $type: "string" } },
        { "warehouseStocks.committedStock": { $type: "string" } },
        { sellingPrice: { $type: "string" } },
        { costPrice: { $type: "string" } }
      ]
    }).toArray();

    console.log(`   Found ${itemsToUpdate.length} items to optimize`);

    let itemsUpdated = 0;

    for (let i = 0; i < itemsToUpdate.length; i += batchSize) {
      const batch = itemsToUpdate.slice(i, i + batchSize);
      const bulkOps = [];

      for (const item of batch) {
        const updates = {};
        
        // Convert price fields
        if (typeof item.sellingPrice === 'string') {
          updates.sellingPrice = parseFloat(item.sellingPrice) || 0;
        }
        if (typeof item.costPrice === 'string') {
          updates.costPrice = parseFloat(item.costPrice) || 0;
        }

        // Convert warehouse stock numbers
        if (item.warehouseStocks && Array.isArray(item.warehouseStocks)) {
          const optimizedStocks = item.warehouseStocks.map(stock => {
            const optimizedStock = { ...stock };
            
            if (typeof stock.stockOnHand === 'string') {
              optimizedStock.stockOnHand = parseFloat(stock.stockOnHand) || 0;
            }
            if (typeof stock.availableForSale === 'string') {
              optimizedStock.availableForSale = parseFloat(stock.availableForSale) || 0;
            }
            if (typeof stock.committedStock === 'string') {
              optimizedStock.committedStock = parseFloat(stock.committedStock) || 0;
            }
            if (typeof stock.openingStock === 'string') {
              optimizedStock.openingStock = parseFloat(stock.openingStock) || 0;
            }
            
            return optimizedStock;
          });
          
          updates.warehouseStocks = optimizedStocks;
        }

        if (Object.keys(updates).length > 0) {
          bulkOps.push({
            updateOne: {
              filter: { _id: item._id },
              update: { $set: updates }
            }
          });
        }
      }

      if (bulkOps.length > 0) {
        await shoeItemCollection.bulkWrite(bulkOps);
        itemsUpdated += bulkOps.length;
        console.log(`   ✅ Updated batch ${Math.ceil((i + batchSize) / batchSize)} (${itemsUpdated} total)`);
      }
    }

    console.log(`   ✅ Optimized ${itemsUpdated} items`);

    // 3. Optimize SalesInvoice Collection
    console.log('\n3️⃣ Optimizing SalesInvoice collection...');
    
    const salesInvoiceCollection = db.collection('salesinvoices');
    
    // Find invoices with string numbers
    const invoicesToUpdate = await salesInvoiceCollection.find({
      $or: [
        { finalTotal: { $type: "string" } },
        { subTotal: { $type: "string" } },
        { totalTax: { $type: "string" } },
        { discountAmount: { $type: "string" } }
      ]
    }).toArray();

    console.log(`   Found ${invoicesToUpdate.length} invoices to optimize`);

    let invoicesUpdated = 0;

    for (let i = 0; i < invoicesToUpdate.length; i += batchSize) {
      const batch = invoicesToUpdate.slice(i, i + batchSize);
      const bulkOps = [];

      for (const invoice of batch) {
        const updates = {};
        
        // Convert number fields
        if (typeof invoice.finalTotal === 'string') {
          updates.finalTotal = parseFloat(invoice.finalTotal) || 0;
        }
        if (typeof invoice.subTotal === 'string') {
          updates.subTotal = parseFloat(invoice.subTotal) || 0;
        }
        if (typeof invoice.totalTax === 'string') {
          updates.totalTax = parseFloat(invoice.totalTax) || 0;
        }
        if (typeof invoice.discountAmount === 'string') {
          updates.discountAmount = parseFloat(invoice.discountAmount) || 0;
        }

        if (Object.keys(updates).length > 0) {
          bulkOps.push({
            updateOne: {
              filter: { _id: invoice._id },
              update: { $set: updates }
            }
          });
        }
      }

      if (bulkOps.length > 0) {
        await salesInvoiceCollection.bulkWrite(bulkOps);
        invoicesUpdated += bulkOps.length;
        console.log(`   ✅ Updated batch ${Math.ceil((i + batchSize) / batchSize)} (${invoicesUpdated} total)`);
      }
    }

    console.log(`   ✅ Optimized ${invoicesUpdated} invoices`);

    // 4. Clean up null/undefined values
    console.log('\n4️⃣ Cleaning up null/undefined values...');
    
    // Set default values for missing fields
    await transactionCollection.updateMany(
      { rbl: { $exists: false } },
      { $set: { rbl: 0 } }
    );
    
    await transactionCollection.updateMany(
      { totalTransaction: { $exists: false } },
      { $set: { totalTransaction: 0 } }
    );

    console.log('   ✅ Cleaned up missing fields');

    // 5. Validation check
    console.log('\n5️⃣ Running validation checks...');
    
    const stringNumbersRemaining = await transactionCollection.countDocuments({
      $or: [
        { cash: { $type: "string" } },
        { bank: { $type: "string" } },
        { upi: { $type: "string" } },
        { amount: { $type: "string" } }
      ]
    });

    if (stringNumbersRemaining === 0) {
      console.log('   ✅ All string numbers converted successfully');
    } else {
      console.warn(`   ⚠️ ${stringNumbersRemaining} documents still have string numbers`);
    }

    console.log('\n🎉 Data type optimization completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Transactions optimized: ${transactionUpdated}`);
    console.log(`   • Items optimized: ${itemsUpdated}`);
    console.log(`   • Invoices optimized: ${invoicesUpdated}`);
    console.log('\n💡 Expected performance improvements:');
    console.log('   • Faster numerical calculations');
    console.log('   • Better index utilization');
    console.log('   • Reduced memory usage');
    console.log('   • Improved aggregation performance');

  } catch (error) {
    console.error('❌ Error optimizing data types:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the script
optimizeDataTypes();