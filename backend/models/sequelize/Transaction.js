import { DataTypes } from 'sequelize';
import { getSequelize } from '../../db/postgresql.js';

const sequelize = getSequelize();

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  invoiceNo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subCategory: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  remark: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  billValue: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  amount: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  cash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  bank: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  upi: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'bank', 'upi', 'split'),
    allowNull: false,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  locCode: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  customerName: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  securityAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  Balance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  subCategory1: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  totalTransaction: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  // Attachment fields
  attachmentFilename: {
    type: DataTypes.STRING,
    field: 'attachment_filename',
  },
  attachmentContentType: {
    type: DataTypes.STRING,
    field: 'attachment_content_type',
  },
  attachmentData: {
    type: DataTypes.BLOB,
    field: 'attachment_data',
  },
  mongoId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Reference to MongoDB document _id',
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
  tableName: 'transactions',
  timestamps: true,
  underscored: false,
});

export default Transaction;

