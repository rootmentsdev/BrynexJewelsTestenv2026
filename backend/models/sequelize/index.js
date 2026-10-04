// Sequelize Models Index
// Import all models here for easy access

import { getSequelize } from '../../db/postgresql.js';

// Import all models
import User from './User.js';
import Transaction from './Transaction.js';
import Vendor from './Vendor.js';
import VendorCredit from './VendorCredit.js';
import VendorHistory from './VendorHistory.js';
import InventoryAdjustment from './InventoryAdjustment.js';
import TransferOrder from './TransferOrder.js';
import StoreOrder from './StoreOrder.js';
import Store from './Store.js';
import SalesPerson from './SalesPerson.js';
import SalesInvoice from './SalesInvoice.js';

// Initialize associations here (when models are ready)
// Example: User.hasMany(Transaction, { foreignKey: 'userId' });

// Store and SalesPerson associations
Store.hasMany(SalesPerson, { foreignKey: 'storeId', as: 'salesPersons' });
SalesPerson.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });

// Export all models and sequelize instance
const sequelize = getSequelize();

export {
  sequelize,
  User,
  Transaction,
  Vendor,
  VendorCredit,
  VendorHistory,
  InventoryAdjustment,
  TransferOrder,
  StoreOrder,
  Store,
  SalesPerson,
  SalesInvoice,
};

export default {
  sequelize,
  User,
  Transaction,
  Vendor,
  VendorCredit,
  VendorHistory,
  InventoryAdjustment,
  TransferOrder,
  StoreOrder,
  Store,
  SalesPerson,
  SalesInvoice,
};

