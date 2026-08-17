// models/Shop.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Shop = sequelize.define('Shop', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  ownerEmail: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'owner_email',
    validate: { isEmail: true },
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: true,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  gstNumber: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'gst_number',
  },
  // Subscription
  plan: {
    type: DataTypes.ENUM('free', 'basic', 'pro'),
    defaultValue: 'free',
  },
  // When the paid subscription ends. For a free trial, set this ~14 days ahead.
  subscriptionEnds: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'subscription_ends',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
}, {
  tableName: 'shops',
});

module.exports = Shop;
