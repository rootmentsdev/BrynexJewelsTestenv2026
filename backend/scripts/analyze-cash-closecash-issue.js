// Diagnostic Script: Analyze Cash/Closecash Field Swap Issue
// This script analyzes all CloseTransaction documents to identify:
// 1. When the issue started (which date)
// 2. Which records are affected
// 3. Pattern of the swap (if Closecash > cash, likely swapped)
//
// Usage:
//   node scripts/analyze-cash-closecash-issue.js [locCode]
//
// Options:
//   locCode    : Optional - analyze specific location only

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import CloseTransaction from '../model/Closing.js';

// Load environment variables
const env = process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
}

const connectMongoDB = async () => {
  const dbURI =
    env === 'production'
      ? process.env.MONGODB_URI_PROD
      : process.env.MONGODB_URI_DEV;

  if (!dbURI) {
    console.error('❌ MONGODB_URI is not defined in environment file.');
    process.exit(1);
  }

  if (env !== 'production' && dbURI.includes('rootfin.onrender.com')) {
    console.warn('❌ Aborting: Trying to connect to production DB from non-production env.');
    process.exit(1);
  }

  try {
    await mongoose.connect(dbURI);
    console.log(`✅ MongoDB connected [${env}]`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

async function analyzeIssue() {
  const locCodeFilter = process.argv[2]; // Optional locCode filter

  try {
    console.log('🔍 Analyzing Cash/Closecash Field Swap Issue\n');
    console.log('='.repeat(70));
    
    if (locCodeFilter) {
      console.log(`📍 Filtering by locCode: ${locCodeFilter}\n`);
    }

    // Connect to MongoDB
    await connectMongoDB();

    // Build query
    const query = locCodeFilter ? { locCode: locCodeFilter } : {};
    
    // Fetch all CloseTransaction documents, sorted by date
    console.log('📊 Fetching CloseTransaction documents...');
    const allDocuments = await CloseTransaction.find(query).sort({ date: 1, locCode: 1 });
    console.log(`   Found ${allDocuments.length} documents\n`);

    if (allDocuments.length === 0) {
      console.log('✅ No documents found. Exiting.');
      await mongoose.disconnect();
      return;
    }

    // Analyze each document
    const analysis = {
      total: allDocuments.length,
      likelySwapped: [],
      likelyCorrect: [],
      equalValues: [],
      zeroValues: [],
      byDate: {},
      byLocCode: {}
    };

    console.log('🔍 Analyzing documents...\n');

    for (const doc of allDocuments) {
      const docObj = doc.toObject ? doc.toObject() : (doc._doc || doc);
      const cash = Number(docObj.cash || 0);
      const Closecash = Number(docObj.Closecash || 0);
      const date = new Date(docObj.date);
      const dateStr = date.toISOString().split('T')[0];
      const locCode = docObj.locCode || 'unknown';

      // Categorize the record
      if (cash === 0 && Closecash === 0) {
        analysis.zeroValues.push({ _id: doc._id, locCode, date: dateStr, cash, Closecash });
      } else if (cash === Closecash) {
        analysis.equalValues.push({ _id: doc._id, locCode, date: dateStr, cash, Closecash });
      } else if (Closecash > cash) {
        // Likely swapped: Closecash (calculated) is usually higher than cash (physical)
        analysis.likelySwapped.push({ _id: doc._id, locCode, date: dateStr, cash, Closecash, difference: Closecash - cash });
      } else {
        // cash > Closecash: Might be correct, or might be a different pattern
        analysis.likelyCorrect.push({ _id: doc._id, locCode, date: dateStr, cash, Closecash, difference: cash - Closecash });
      }

      // Group by date
      if (!analysis.byDate[dateStr]) {
        analysis.byDate[dateStr] = { total: 0, swapped: 0, correct: 0, equal: 0 };
      }
      analysis.byDate[dateStr].total++;
      if (Closecash > cash) {
        analysis.byDate[dateStr].swapped++;
      } else if (cash > Closecash) {
        analysis.byDate[dateStr].correct++;
      } else {
        analysis.byDate[dateStr].equal++;
      }

      // Group by locCode
      if (!analysis.byLocCode[locCode]) {
        analysis.byLocCode[locCode] = { total: 0, swapped: 0, correct: 0, equal: 0 };
      }
      analysis.byLocCode[locCode].total++;
      if (Closecash > cash) {
        analysis.byLocCode[locCode].swapped++;
      } else if (cash > Closecash) {
        analysis.byLocCode[locCode].correct++;
      } else {
        analysis.byLocCode[locCode].equal++;
      }
    }

    // Display summary
    console.log('📋 Analysis Summary:\n');
    console.log(`   Total documents: ${analysis.total}`);
    console.log(`   Likely swapped (Closecash > cash): ${analysis.likelySwapped.length} (${((analysis.likelySwapped.length / analysis.total) * 100).toFixed(1)}%)`);
    console.log(`   Likely correct (cash > Closecash): ${analysis.likelyCorrect.length} (${((analysis.likelyCorrect.length / analysis.total) * 100).toFixed(1)}%)`);
    console.log(`   Equal values: ${analysis.equalValues.length} (${((analysis.equalValues.length / analysis.total) * 100).toFixed(1)}%)`);
    console.log(`   Zero values: ${analysis.zeroValues.length} (${((analysis.zeroValues.length / analysis.total) * 100).toFixed(1)}%)`);
    console.log('');

    // Find the earliest swapped record (when issue started)
    if (analysis.likelySwapped.length > 0) {
      const sortedSwapped = [...analysis.likelySwapped].sort((a, b) => 
        new Date(a.date) - new Date(b.date)
      );
      const earliestSwapped = sortedSwapped[0];
      const latestSwapped = sortedSwapped[sortedSwapped.length - 1];
      
      console.log('📅 Issue Timeline:');
      console.log(`   Earliest swapped record: ${earliestSwapped.date} (locCode: ${earliestSwapped.locCode})`);
      console.log(`   Latest swapped record: ${latestSwapped.date} (locCode: ${latestSwapped.locCode})`);
      console.log('');
    }

    // Show date-based analysis (first 20 dates)
    console.log('📊 Analysis by Date (showing dates with swapped records):');
    console.log('-'.repeat(70));
    const datesWithSwaps = Object.entries(analysis.byDate)
      .filter(([_, stats]) => stats.swapped > 0)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .slice(0, 20);
    
    if (datesWithSwaps.length > 0) {
      datesWithSwaps.forEach(([date, stats]) => {
        const swapPercent = ((stats.swapped / stats.total) * 100).toFixed(1);
        console.log(`   ${date}: ${stats.swapped}/${stats.total} swapped (${swapPercent}%), ${stats.correct} correct, ${stats.equal} equal`);
      });
      if (Object.keys(analysis.byDate).length > 20) {
        console.log(`   ... and ${Object.keys(analysis.byDate).length - 20} more dates`);
      }
    } else {
      console.log('   No dates with swapped records found');
    }
    console.log('');

    // Show locCode-based analysis
    console.log('📍 Analysis by Location:');
    console.log('-'.repeat(70));
    const locCodesSorted = Object.entries(analysis.byLocCode)
      .sort(([_, statsA], [__, statsB]) => statsB.swapped - statsA.swapped)
      .slice(0, 10);
    
    locCodesSorted.forEach(([locCode, stats]) => {
      const swapPercent = ((stats.swapped / stats.total) * 100).toFixed(1);
      console.log(`   locCode ${locCode}: ${stats.swapped}/${stats.total} swapped (${swapPercent}%), ${stats.correct} correct, ${stats.equal} equal`);
    });
    if (Object.keys(analysis.byLocCode).length > 10) {
      console.log(`   ... and ${Object.keys(analysis.byLocCode).length - 10} more locations`);
    }
    console.log('');

    // Show sample swapped records
    if (analysis.likelySwapped.length > 0) {
      console.log('📝 Sample Swapped Records (first 10):');
      console.log('-'.repeat(70));
      analysis.likelySwapped.slice(0, 10).forEach((record, idx) => {
        console.log(`\n${idx + 1}. Date: ${record.date}, locCode: ${record.locCode}`);
        console.log(`   Current: cash=${record.cash}, Closecash=${record.Closecash}`);
        console.log(`   After swap: cash=${record.Closecash}, Closecash=${record.cash}`);
        console.log(`   Difference: ${record.difference}`);
      });
      if (analysis.likelySwapped.length > 10) {
        console.log(`\n   ... and ${analysis.likelySwapped.length - 10} more swapped records`);
      }
      console.log('-'.repeat(70));
    }

    // Show sample correct records (if any)
    if (analysis.likelyCorrect.length > 0) {
      console.log('\n📝 Sample Correct Records (first 5):');
      console.log('-'.repeat(70));
      analysis.likelyCorrect.slice(0, 5).forEach((record, idx) => {
        console.log(`${idx + 1}. Date: ${record.date}, locCode: ${record.locCode}, cash=${record.cash}, Closecash=${record.Closecash}, diff=${record.difference}`);
      });
      console.log('-'.repeat(70));
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    if (analysis.likelySwapped.length > 0) {
      console.log(`   ✅ ${analysis.likelySwapped.length} records need to be swapped`);
      if (analysis.likelySwapped.length === analysis.total) {
        console.log('   ⚠️  ALL records appear to be swapped - safe to migrate all');
      } else {
        console.log('   ⚠️  Some records appear correct - review before migrating');
      }
    } else {
      console.log('   ✅ No swapped records found - data appears correct');
    }
    console.log('');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the analysis
analyzeIssue().catch(console.error);
