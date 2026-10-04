import { DataTypes } from 'sequelize';
import { getSequelize } from '../../db/postgresql.js';

const sequelize = getSequelize();

const Vendor = sequelize.define('Vendor', {
  id: {
    type: DataTypes.STRING,  // Changed to STRING to accept MongoDB ObjectIds and UUIDs
    primaryKey: true,
    allowNull: false,
    // Note: UUID will be generated in controller if not provided
  },
  // Primary Contact
  salutation: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  firstName: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  lastName: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  companyName: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  displayName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  phone: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  mobile: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  vendorLanguage: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  // Other Details
  gstTreatment: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  sourceOfSupply: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  pan: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  gstin: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'INR',
  },
  paymentTerms: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  tds: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  enablePortal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  // Contacts (JSON field for array of contacts)
  contacts: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  // Billing Address
  billingAttention: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  billingAddress: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  billingAddress2: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  billingCity: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  billingState: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  billingPinCode: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  billingCountry: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  billingPhone: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  billingFax: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  // Shipping Address
  shippingAttention: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  shippingAddress: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  shippingAddress2: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  shippingCity: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  shippingState: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  shippingPinCode: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  shippingCountry: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  shippingPhone: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  shippingFax: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  // Bank Accounts (JSON field for array)
  bankAccounts: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  // Financial
  payables: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  credits: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  itemsToReceive: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  totalItemsOrdered: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  // Remarks
  remarks: {
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
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active',
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'vendors',
  timestamps: true,
  underscored: false,
});

export default Vendor;

