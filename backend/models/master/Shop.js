// models/master/Shop.js — one row per business (tenant) in the MASTER database
const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/database");

const Shop = sequelize.define(
  "Shop",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    // Name of this shop's private MySQL database (e.g. sm_shop_12)
    dbName: { type: DataTypes.STRING(64), allowNull: true, field: "db_name" },
    ownerEmail: { type: DataTypes.STRING(120), allowNull: false, field: "owner_email" },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    businessType: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "supermarket",
      field: "business_type",
    },
    plan: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "free" },
    subscriptionEnds: { type: DataTypes.DATE, allowNull: true, field: "subscription_ends" },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: "is_active" },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "shops",
    indexes: [{ name: "uq_shops_db_name", unique: true, fields: ["db_name"] }],
  },
);

module.exports = Shop;
