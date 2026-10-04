// Migration Script: Fix Cash and Closecash Field Swap
// This script swaps the values in 'cash' and 'Closecash' fields for all CloseTransaction documents
// 
// Issue: Previously, calculated closing cash was saved in 'Closecash' and physical cash in 'cash'
// Fix: Swap them so 'cash' = calculated closing (used as next day opening) and 'Closecash' = physical count
//
// Usage:
//   node scripts/fix-cash-closecash-swap.js [--dry-run] [--confirm]
//
// Options:
//   --dry-run    : Show what would be changed without actually updating
//   --confirm    : Skip confirmation prompt (use with caution)

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

  // 🛑 Safety check: Prevent connecting to production DB from non-production env
  if (env !== 'production' && dbURI.includes('rootfin.onrender.com')) {
    console.warn('❌ Aborting: Trying to connect to production DB from non-production env.');
    process.exit(1);
  }

  // Extract database info for display
  let dbName = 'Unknown';
  let dbHost = 'Unknown';
  try {
    const uriMatch = dbURI.match(/mongodb(\+srv)?:\/\/([^:]+:[^@]+@)?([^/]+)\/([^?]+)/);
    if (uriMatch) {
      dbHost = uriMatch[3];
      dbName = uriMatch[4];
    }
  } catch (e) {
    // Ignore parsing errors
  }

  console.log(`\n📊 Connecting to Database:`);
  console.log(`   Environment: ${env}`);
  console.log(`   Database: ${dbName}`);
  console.log(`   Host: ${dbHost}`);
  
  if (env === 'production') {
    console.log(`\n⚠️  WARNING: You are connecting to PRODUCTION database!`);
  }

  try {
    await mongoose.connect(dbURI);
    console.log(`✅ MongoDB connected [${env}]`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

async function swapCashFields() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const skipConfirm = args.includes('--confirm');

  try {
    console.log('🔄 Starting Cash/Closecash Field Swap Migration\n');
    console.log('='.repeat(70));
    
    if (isDryRun) {
      console.log('⚠️  DRY RUN MODE - No changes will be made\n');
    }

    // Connect to MongoDB
    await connectMongoDB();

    // Fetch all CloseTransaction documents
    console.log('\n📊 Fetching all CloseTransaction documents...');
    const allDocuments = await CloseTransaction.find({}).sort({ date: 1, locCode: 1 });
    console.log(`   Found ${allDocuments.length} documents\n`);

    if (allDocuments.length === 0) {
      console.log('✅ No documents to migrate. Exiting.');
      await mongoose.disconnect();
      return;
    }

    // Analyze and prepare updates
    const updates = [];
    let totalSwapped = 0;
    let totalSkipped = 0;

    console.log('🔍 Analyzing documents...\n');
    
    for (const doc of allDocuments) {
      const docObj = doc.toObject ? doc.toObject() : (doc._doc || doc);
      const currentCash = Number(docObj.cash || 0);
      const currentClosecash = Number(docObj.Closecash || 0);
      
      // Skip if both values are 0 (nothing meaningful to swap)
      if (currentCash === 0 && currentClosecash === 0) {
        totalSkipped++;
        continue;
      }

      // Determine if swap is needed
      // Based on the issue: Closecash contains calculated closing (should be in cash)
      // and cash contains physical count (should be in Closecash)
      // We'll swap all records to ensure consistency, but we can detect likely swaps:
      // - If Closecash > cash, it's likely swapped (calculated > physical is common)
      // - If both are equal, we'll still swap to be consistent
      // - If cash is 0 but Closecash has value, definitely swap
      const likelySwapped = currentClosecash > currentCash || (currentCash === 0 && currentClosecash > 0);
      
      updates.push({
        _id: doc._id,
        locCode: docObj.locCode,
        date: docObj.date,
        currentCash,
        currentClosecash,
        newCash: currentClosecash,      // Swap: Closecash → cash (calculated closing)
        newClosecash: currentCash,       // Swap: cash → Closecash (physical count)
        likelySwapped,
        email: docObj.email || ''
      });

      // Count all as needing swap (we're fixing all records for consistency)
      totalSwapped++;
    }

    // Display summary
    console.log('📋 Migration Summary:');
    console.log(`   Total documents: ${allDocuments.length}`);
    console.log(`   Documents to swap: ${totalSwapped}`);
    console.log(`   Documents to skip: ${totalSkipped}`);
    console.log('');

    // Show sample of what will be changed
    if (updates.length > 0) {
      console.log('📝 Sample changes (first 5 documents):');
      console.log('-'.repeat(70));
      updates.slice(0, 5).forEach((update, idx) => {
        const dateStr = new Date(update.date).toISOString().split('T')[0];
        console.log(`\n${idx + 1}. locCode: ${update.locCode}, Date: ${dateStr}`);
        console.log(`   Before: cash=${update.currentCash}, Closecash=${update.currentClosecash}`);
        console.log(`   After:  cash=${update.newCash}, Closecash=${update.newClosecash}`);
      });
      if (updates.length > 5) {
        console.log(`\n   ... and ${updates.length - 5} more documents`);
      }
      console.log('-'.repeat(70));
    }

    // Confirmation
    if (!isDryRun && !skipConfirm) {
      console.log('\n⚠️  WARNING: This will modify all CloseTransaction documents!');
      console.log('   Make sure you have a database backup before proceeding.');
      console.log('\n   To proceed, run with --confirm flag:');
      console.log('   node scripts/fix-cash-closecash-swap.js --confirm\n');
      await mongoose.disconnect();
      return;
    }

    if (isDryRun) {
      console.log('\n✅ Dry run complete. No changes made.');
      console.log('   To apply changes, run without --dry-run flag:\n');
      console.log('   node scripts/fix-cash-closecash-swap.js --confirm\n');
      await mongoose.disconnect();
      return;
    }

    // Perform the swap
    console.log('\n🔄 Applying changes...\n');
    let successCount = 0;
    let errorCount = 0;

    for (const update of updates) {
      try {
        await CloseTransaction.updateOne(
          { _id: update._id },
          {
            $set: {
              cash: update.newCash,
              Closecash: update.newClosecash
            }
          }
        );
        successCount++;
        
        if (successCount % 100 === 0) {
          console.log(`   ✅ Updated ${successCount} documents...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error updating document ${update._id}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Migration Complete!\n');
    console.log(`   Successfully updated: ${successCount} documents`);
    if (errorCount > 0) {
      console.log(`   Errors: ${errorCount} documents`);
    }
    console.log(`   Skipped: ${totalSkipped} documents (no swap needed)`);
    console.log('\n📌 Next Steps:');
    console.log('   1. Verify the changes in your database');
    console.log('   2. Test the Close Report to ensure opening balances are correct');
    console.log('   3. Check that new closing entries save correctly\n');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the migration
swapCashFields().catch(console.error);
