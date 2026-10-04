// Migration Script: Move Vendors from MongoDB to PostgreSQL
// Run this script to migrate existing vendor data

import { connectPostgreSQL } from '../db/postgresql.js';
import { Vendor as PGVendor } from '../models/sequelize/index.js';
import Vendor from '../model/Vendor.js';  // MongoDB model
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';

const env = process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;

if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
} else {
  dotenv.config();
}

async function migrateVendors() {
  try {
    console.log('🔄 Starting Vendor Migration: MongoDB → PostgreSQL\n');
    console.log('='.repeat(60));
    
    // Step 1: Connect to both databases
    console.log('\n1️⃣  Connecting to databases...');
    
    // Connect to PostgreSQL
    await connectPostgreSQL();
    console.log('   ✅ PostgreSQL connected');
    
    // Connect to MongoDB
    const mongoURI = env === 'production' 
      ? process.env.MONGODB_URI_PROD 
      : process.env.MONGODB_URI_DEV;
    
    if (!mongoURI) {
      throw new Error('MongoDB URI not found in environment');
    }
    
    await mongoose.connect(mongoURI);
    console.log('   ✅ MongoDB connected\n');
    
    // Step 2: Sync PostgreSQL model (create table if needed)
    console.log('2️⃣  Setting up PostgreSQL table...');
    await PGVendor.sync({ alter: false });
    console.log('   ✅ Table ready\n');
    
    // Step 3: Get all vendors from MongoDB
    console.log('3️⃣  Fetching vendors from MongoDB...');
    const mongoVendors = await Vendor.find({});
    console.log(`   ✅ Found ${mongoVendors.length} vendor(s) in MongoDB\n`);
    
    if (mongoVendors.length === 0) {
      console.log('   ℹ️  No vendors to migrate. Exiting...\n');
      await mongoose.disconnect();
      process.exit(0);
    }
    
    // Step 4: Migrate each vendor
    console.log('4️⃣  Migrating vendors to PostgreSQL...\n');
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const mongoVendor of mongoVendors) {
      try {
        // Check if vendor already exists in PostgreSQL (by displayName and userId)
        const existing = await PGVendor.findOne({
          where: {
            displayName: mongoVendor.displayName,
            userId: mongoVendor.userId,
          },
        });
        
        if (existing) {
          console.log(`   ⏭️  Skipping: ${mongoVendor.displayName} (already exists)`);
          skipCount++;
          continue;
        }
        
        // Convert MongoDB document to PostgreSQL format
        const vendorData = {
          // Use MongoDB _id as string for reference (or generate new UUID)
          id: mongoVendor._id.toString(),  // Keep MongoDB ID for reference
          salutation: mongoVendor.salutation || '',
          firstName: mongoVendor.firstName || '',
          lastName: mongoVendor.lastName || '',
          companyName: mongoVendor.companyName || '',
          displayName: mongoVendor.displayName,
          email: mongoVendor.email || '',
          phone: mongoVendor.phone || '',
          mobile: mongoVendor.mobile || '',
          vendorLanguage: mongoVendor.vendorLanguage || '',
          gstTreatment: mongoVendor.gstTreatment || '',
          sourceOfSupply: mongoVendor.sourceOfSupply || '',
          pan: mongoVendor.pan || '',
          gstin: mongoVendor.gstin || '',
          currency: mongoVendor.currency || 'INR',
          paymentTerms: mongoVendor.paymentTerms || '',
          tds: mongoVendor.tds || '',
          enablePortal: mongoVendor.enablePortal || false,
          contacts: mongoVendor.contacts || [],
          billingAttention: mongoVendor.billingAttention || '',
          billingAddress: mongoVendor.billingAddress || '',
          billingAddress2: mongoVendor.billingAddress2 || '',
          billingCity: mongoVendor.billingCity || '',
          billingState: mongoVendor.billingState || '',
          billingPinCode: mongoVendor.billingPinCode || '',
          billingCountry: mongoVendor.billingCountry || '',
          billingPhone: mongoVendor.billingPhone || '',
          billingFax: mongoVendor.billingFax || '',
          shippingAttention: mongoVendor.shippingAttention || '',
          shippingAddress: mongoVendor.shippingAddress || '',
          shippingAddress2: mongoVendor.shippingAddress2 || '',
          shippingCity: mongoVendor.shippingCity || '',
          shippingState: mongoVendor.shippingState || '',
          shippingPinCode: mongoVendor.shippingPinCode || '',
          shippingCountry: mongoVendor.shippingCountry || '',
          shippingPhone: mongoVendor.shippingPhone || '',
          shippingFax: mongoVendor.shippingFax || '',
          bankAccounts: mongoVendor.bankAccounts || [],
          payables: mongoVendor.payables || 0,
          credits: mongoVendor.credits || 0,
          itemsToReceive: mongoVendor.itemsToReceive || 0,
          totalItemsOrdered: mongoVendor.totalItemsOrdered || 0,
          remarks: mongoVendor.remarks || '',
          userId: mongoVendor.userId,
          locCode: mongoVendor.locCode || '',
          createdAt: mongoVendor.createdAt || new Date(),
          updatedAt: mongoVendor.updatedAt || new Date(),
        };
        
        // Create in PostgreSQL
        await PGVendor.create(vendorData);
        console.log(`   ✅ Migrated: ${mongoVendor.displayName}`);
        successCount++;
      } catch (error) {
        console.error(`   ❌ Error migrating ${mongoVendor.displayName}:`, error.message);
        errorCount++;
      }
    }
    
    // Step 5: Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Migration Summary:\n');
    console.log(`   ✅ Successfully migrated: ${successCount}`);
    console.log(`   ⏭️  Skipped (already exists): ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📦 Total processed: ${mongoVendors.length}\n`);
    
    // Step 6: Verify
    console.log('5️⃣  Verifying migration...');
    const pgVendorCount = await PGVendor.count();
    console.log(`   ✅ PostgreSQL now has ${pgVendorCount} vendor(s)\n`);
    
    // Disconnect
    await mongoose.disconnect();
    console.log('✅ Migration complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrateVendors();

