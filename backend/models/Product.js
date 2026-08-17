// models/Product.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Product = sequelize.define(
  "Product",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // ── Multi-tenant key ──────────────────────────────────────────────
    shopId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "shop_id",
      references: { model: "shops", key: "id" },
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    barcode: {
      type: DataTypes.STRING(100),
      allowNull: true,
      // NOTE: no longer globally unique — uniqueness is per shop (index below)
    },
    serialNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "serial_number",
    },
    mrp: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "mrp",
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    category: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    expiryDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "expiry_date",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_active",
    },
  },
  {
    tableName: "products",
    indexes: [
      // barcode / serial unique *within* a shop, not globally
      { unique: true, fields: ["shop_id", "barcode"] },
      { unique: true, fields: ["shop_id", "serial_number"] },
    ],
  },
);

module.exports = Product;
