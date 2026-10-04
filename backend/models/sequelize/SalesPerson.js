import { DataTypes } from 'sequelize';
import { getSequelize } from '../../db/postgresql.js';

const sequelize = getSequelize();

const SalesPerson = sequelize.define('SalesPerson', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  employeeId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Unique employee ID for the sales person',
  },
  email: {
    type: DataTypes.STRING,
    defaultValue: '',
    validate: {
      isEmail: true,
    },
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  storeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'stores',
      key: 'id',
    },
    comment: 'Foreign key to Store - determines which store this sales person belongs to',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
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
  tableName: 'sales_persons',
  timestamps: true,
  underscored: false,
});

export default SalesPerson;
