import { DataTypes } from 'sequelize';
import { getSequelize } from '../../db/postgresql.js';

const sequelize = getSequelize();

const VendorCredit = sequelize.define('VendorCredit', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  // Vendor Information
  vendorId: {
    type: DataTypes.STRING, // UUID string from PostgreSQL Vendor
    allowNull: true,
  },
  vendorName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  branch: {
    type: DataTypes.STRING,
    defaultValue: 'Head Office',
  },
  
  // Credit Details
  creditNoteNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  orderNumber: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  creditDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  subject: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  
  // Tax Settings
  reverseCharge: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  warehouse: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  atTransactionLevel: {
    type: DataTypes.STRING,
    defaultValue: 'At Transaction Level',
  },
  
  // Items (stored as JSONB array)
  items: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  
  // Summary
  discount: {
    type: DataTypes.JSONB,
    defaultValue: { value: '0', type: '%' },
  },
  applyDiscountAfterTax: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  totalTaxAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  tdsTcsType: {
    type: DataTypes.STRING,
    defaultValue: 'TDS',
  },
  tdsTcsTax: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  tdsTcsAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  adjustment: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  
  // Totals
  subTotal: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  discountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  totalTax: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  finalTotal: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  
  // Notes
  notes: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  
  // User association
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  locCode: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  
  // Status
  status: {
    type: DataTypes.STRING,
    defaultValue: 'draft',
  },
  
  // Credit Application Tracking
  unusedCredit: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0, // Amount of credit not yet applied to bills
  },
  appliedCredit: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0, // Amount of credit already applied to bills
  },
  appliedToBills: {
    type: DataTypes.JSONB,
    defaultValue: [], // Array of { billId, billNumber, appliedAmount, appliedDate }
  },
}, {
  tableName: 'vendor_credits',
  timestamps: true,
  underscored: false,
});

export default VendorCredit;

