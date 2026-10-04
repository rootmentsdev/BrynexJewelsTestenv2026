import { DataTypes } from 'sequelize';
import { getSequelize } from '../../db/postgresql.js';

const sequelize = getSequelize();

const StoreOrder = sequelize.define('StoreOrder', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  
  // Basic Information
  orderNumber: {
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
    type: DataTypes.ENUM('draft', 'pending', 'approved', 'rejected', 'transferred'),
    defaultValue: 'pending',
  },
  
  // Warehouse Information
  storeWarehouse: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'The store/warehouse that is requesting items (source)',
  },
  destinationWarehouse: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Warehouse',
    comment: 'The warehouse that will fulfill the order (always Warehouse)',
  },
  
  // Items being requested (stored as JSONB array)
  // Each item includes: itemId, itemGroupId, itemName, itemSku, quantity, currentStock
  items: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  
  // Reference to the transfer order created when approved (if any)
  transferOrderId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID of the transfer order created when this store order is approved',
  },
  
  // Audit Trail
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'User ID of the store user who created the order',
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  approvedBy: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'User ID of admin/warehouse user who approved the order',
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  rejectedBy: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'User ID of admin/warehouse user who rejected the order',
  },
  rejectedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  locCode: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  
  // Totals
  totalQuantityRequested: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
}, {
  tableName: 'store_orders',
  timestamps: true,
  underscored: false,
  indexes: [
    {
      fields: ['userId', 'date'],
      name: 'store_orders_user_date_idx',
    },
    {
      fields: ['storeWarehouse', 'status'],
      name: 'store_orders_store_status_idx',
    },
    {
      fields: ['status'],
      name: 'store_orders_status_idx',
    },
    {
      fields: ['orderNumber'],
      name: 'store_orders_number_idx',
      unique: true,
    },
    {
      fields: ['transferOrderId'],
      name: 'store_orders_transfer_order_idx',
    },
  ],
});

export default StoreOrder;
