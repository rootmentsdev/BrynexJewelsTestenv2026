import { DataTypes } from 'sequelize';
import { getSequelize } from '../../db/postgresql.js';

const sequelize = getSequelize();

const VendorHistory = sequelize.define('VendorHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  vendorId: {
    type: DataTypes.STRING, // UUID string from PostgreSQL Vendor
    allowNull: false,
    references: {
      model: 'vendors',
      key: 'id',
    },
  },
  eventType: {
    type: DataTypes.ENUM(
      'BILL_ADDED',
      'BILL_UPDATED',
      'BILL_DELETED',
      'CONTACT_ADDED',
      'CONTACT_PERSON_ADDED',
      'CONTACT_PERSON_UPDATED',
      'VENDOR_CREATED',
      'VENDOR_UPDATED',
      'PAYMENT_MADE',
      'VENDOR_CREDIT_ADDED',
      'VENDOR_CREDIT_UPDATED'
    ),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  originator: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'System',
  },
  relatedEntityId: {
    type: DataTypes.STRING, // Can be bill ID, contact person ID, etc.
    allowNull: true,
  },
  relatedEntityType: {
    type: DataTypes.STRING, // "bill", "contact_person", "vendor_credit", etc.
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  changedBy: {
    type: DataTypes.STRING,
    defaultValue: '',
  },
  changedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'vendor_histories',
  timestamps: true,
  underscored: false,
  indexes: [
    {
      fields: ['vendorId', 'changedAt'],
    },
    {
      fields: ['eventType'],
    },
  ],
});

export default VendorHistory;









