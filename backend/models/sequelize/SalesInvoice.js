import { DataTypes } from 'sequelize';
import { getSequelize } from '../../db/postgresql.js';

const sequelize = getSequelize();

const SalesInvoice = sequelize.define('SalesInvoice', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  invoiceNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  invoiceDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  customer: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  customerPhone: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  branch: {
    type: DataTypes.STRING,
    defaultValue: 'Head Office',
  },
  orderNumber: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  terms: {
    type: DataTypes.STRING,
    defaultValue: 'Due on Receipt',
  },
  salesperson: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  subject: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  warehouse: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  subCategory: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  remark: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  paymentMethod: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  isSplitPayment: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  splitPaymentAmounts: {
    type: DataTypes.JSON,
    defaultValue: { cash: '', bank: '', upi: '', rbl: '' },
  },
  lineItems: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  customerNotes: {
    type: DataTypes.TEXT,
    defaultValue: 'Thanks for your business.',
  },
  termsAndConditions: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  discount: {
    type: DataTypes.JSON,
    defaultValue: { value: '0', type: '%' },
  },
  applyDiscountAfterTax: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  tdsTcsType: {
    type: DataTypes.ENUM('TDS', 'TCS'),
    defaultValue: 'TDS',
  },
  tdsTcsTax: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  adjustment: {
    type: DataTypes.STRING,
    defaultValue: '0.00',
  },
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
  tdsTcsAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  adjustmentAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  finalTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'paid', 'overdue'),
    defaultValue: 'draft',
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  locCode: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  mongoId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Reference to MongoDB document _id',
  },
}, {
  tableName: 'sales_invoices',
  timestamps: true,
  indexes: [
    {
      fields: ['userId', 'createdAt']
    },
    {
      fields: ['invoiceNumber'],
      unique: true
    }
  ]
});

export default SalesInvoice;