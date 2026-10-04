import { DataTypes } from 'sequelize';
import { getSequelize } from '../../db/postgresql.js';

const sequelize = getSequelize();

const InventoryAdjustment = sequelize.define('InventoryAdjustment', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  
  // Basic Information
  referenceNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  adjustmentType: {
    type: DataTypes.ENUM('quantity', 'value'),
    allowNull: false,
    defaultValue: 'quantity',
  },
  status: {
    type: DataTypes.ENUM('draft', 'adjusted'),
    defaultValue: 'draft',
  },
  
  // Location Information
  branch: {
    type: DataTypes.STRING,
    defaultValue: 'Head Office',
  },
  warehouse: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  
  // Financial Information
  account: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Cost of Goods Sold',
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  
  // Items being adjusted (stored as JSONB array)
  items: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  
  // Attachments (stored as JSONB array)
  attachments: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  
  // Audit Trail
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  modifiedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  locCode: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  
  // Totals
  totalQuantityAdjusted: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  totalValueAdjusted: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
}, {
  tableName: 'inventory_adjustments',
  timestamps: true,
  underscored: false,
  indexes: [
    {
      fields: ['userId', 'date'],
      name: 'inventory_adjustments_user_date_idx',
    },
    {
      fields: ['warehouse', 'status'],
      name: 'inventory_adjustments_warehouse_status_idx',
    },
    {
      fields: ['referenceNumber'],
      name: 'inventory_adjustments_reference_idx',
    },
  ],
});

export default InventoryAdjustment;









