// models/index.js
const sequelize = require('../config/database');
const Shop = require('./Shop');
const User = require('./User');
const Product = require('./Product');
const Bill = require('./Bill');
const BillItem = require('./BillItem');

// ── Tenant (Shop) associations ───────────────────────────────────────
Shop.hasMany(User, { foreignKey: 'shopId', as: 'users', onDelete: 'CASCADE' });
User.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop' });

Shop.hasMany(Product, { foreignKey: 'shopId', as: 'products', onDelete: 'CASCADE' });
Product.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop' });

Shop.hasMany(Bill, { foreignKey: 'shopId', as: 'bills', onDelete: 'CASCADE' });
Bill.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop' });

// ── Existing associations ────────────────────────────────────────────
Bill.hasMany(BillItem, { foreignKey: 'billId', as: 'items', onDelete: 'CASCADE' });
BillItem.belongsTo(Bill, { foreignKey: 'billId', as: 'bill' });

Product.hasMany(BillItem, { foreignKey: 'productId', as: 'billItems' });
BillItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

module.exports = { sequelize, Shop, User, Product, Bill, BillItem };
