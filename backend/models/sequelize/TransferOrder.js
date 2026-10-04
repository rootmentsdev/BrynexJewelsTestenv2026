import { DataTypes } from 'sequelize';
import { getSequelize } from '../../db/postgresql.js';

const sequelize = getSequelize();

const TransferOrder = sequelize.define('TransferOrder', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  
  // Basic Information
  transferOrderNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('draft', 'in_transit', 'transferred'),
    defaultValue: 'draft',
  },
  
  // Warehouse Information
  sourceWarehouse: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  destinationWarehouse: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  
  // Items being transferred (stored as JSONB array)
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
  totalQuantityTransferred: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
}, {
  tableName: 'transfer_orders',
  timestamps: true,
  underscored: false,
  indexes: [
    {
      fields: ['userId', 'date'],
      name: 'transfer_orders_user_date_idx',
    },
    {
      fields: ['sourceWarehouse', 'status'],
      name: 'transfer_orders_source_status_idx',
    },
    {
      fields: ['destinationWarehouse', 'status'],
      name: 'transfer_orders_dest_status_idx',
    },
    {
      fields: ['transferOrderNumber'],
      name: 'transfer_orders_number_idx',
      unique: true,
    },
  ],
});

export default TransferOrder;









