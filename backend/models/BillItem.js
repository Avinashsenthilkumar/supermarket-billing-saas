// models/BillItem.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BillItem = sequelize.define('BillItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  billId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'bill_id',
    references: { model: 'bills', key: 'id' },
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'product_id',
    references: { model: 'products', key: 'id' },
  },
  productName: {
    type: DataTypes.STRING(150),
    allowNull: false,
    field: 'product_name',
  },
  productBarcode: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'product_barcode',
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'unit_price',
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 },
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'total_price',
  },
}, {
  tableName: 'bill_items',
});

module.exports = BillItem;
