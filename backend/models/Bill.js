// models/Bill.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Bill = sequelize.define('Bill', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  // ── Multi-tenant key ──────────────────────────────────────────────
  shopId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'shop_id',
    references: { model: 'shops', key: 'id' },
  },
  billNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'bill_number',
    // unique per shop (index below) instead of globally
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  taxRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    field: 'tax_rate',
  },
  taxAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'tax_amount',
  },
  discountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'discount_amount',
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'total_amount',
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'card', 'upi', 'other'),
    defaultValue: 'cash',
    field: 'payment_method',
  },
  customerName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'customer_name',
  },
  customerPhone: {
    type: DataTypes.STRING(15),
    allowNull: true,
    field: 'customer_phone',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('completed', 'cancelled', 'refunded'),
    defaultValue: 'completed',
  },
}, {
  tableName: 'bills',
  indexes: [
    { unique: true, fields: ['shop_id', 'bill_number'] },
  ],
});

module.exports = Bill;
