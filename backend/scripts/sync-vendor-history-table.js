/**
 * Script to sync/create the VendorHistory table in PostgreSQL
 * Run this script to ensure the vendor_histories table exists
 */

import { connectPostgreSQL } from '../db/postgresql.js';
import { VendorHistory } from '../models/sequelize/index.js';

(async () => {
  try {
    console.log('🔄 Connecting to PostgreSQL...');
    await connectPostgreSQL();
    
    console.log('🔄 Syncing VendorHistory table...');
    await VendorHistory.sync({ alter: true });
    
    console.log('✅ VendorHistory table synced successfully!');
    console.log('📊 Table name: vendor_histories');
    
    // Verify table exists by counting records
    const count = await VendorHistory.count();
    console.log(`📈 Current records in table: ${count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error syncing VendorHistory table:', error);
    process.exit(1);
  }
})();









