// Migration script to add unusedCredit, appliedCredit, and appliedToBills columns
// to the vendor_credits table

import { getSequelize } from '../db/postgresql.js';

async function addVendorCreditColumns() {
  try {
    const sequelize = getSequelize();
    
    // Check if columns already exist and add them if they don't
    const queryInterface = sequelize.getQueryInterface();
    
    // Check if unusedCredit column exists
    const tableDescription = await queryInterface.describeTable('vendor_credits');
    
    if (!tableDescription.unusedCredit) {
      console.log('Adding unusedCredit column...');
      await queryInterface.addColumn('vendor_credits', 'unusedCredit', {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        allowNull: false,
      });
      console.log('✅ Added unusedCredit column');
    } else {
      console.log('⚠️ unusedCredit column already exists');
    }
    
    if (!tableDescription.appliedCredit) {
      console.log('Adding appliedCredit column...');
      await queryInterface.addColumn('vendor_credits', 'appliedCredit', {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        allowNull: false,
      });
      console.log('✅ Added appliedCredit column');
    } else {
      console.log('⚠️ appliedCredit column already exists');
    }
    
    if (!tableDescription.appliedToBills) {
      console.log('Adding appliedToBills column...');
      await queryInterface.addColumn('vendor_credits', 'appliedToBills', {
        type: sequelize.Sequelize.JSONB,
        defaultValue: [],
        allowNull: false,
      });
      console.log('✅ Added appliedToBills column');
    } else {
      console.log('⚠️ appliedToBills column already exists');
    }
    
    // Update existing records to set unusedCredit = finalTotal for open credits
    console.log('Updating existing vendor credits...');
    await sequelize.query(`
      UPDATE vendor_credits 
      SET "unusedCredit" = "finalTotal",
          "appliedCredit" = 0,
          "appliedToBills" = '[]'::jsonb
      WHERE "unusedCredit" = 0 AND "finalTotal" > 0
    `);
    console.log('✅ Updated existing vendor credits');
    
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addVendorCreditColumns();

