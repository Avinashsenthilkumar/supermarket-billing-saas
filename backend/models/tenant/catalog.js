// models/tenant/catalog.js — Product, Supplier, StockMovement
const { DataTypes } = require("sequelize");
const { money, qty } = require("./helpers");

module.exports = (sequelize) => {
  const Product = sequelize.define(
    "Product",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(180), allowNull: false },
      barcode: { type: DataTypes.STRING(100), allowNull: true },
      serialNumber: { type: DataTypes.STRING(100), allowNull: true, field: "serial_number" },
      category: { type: DataTypes.STRING(80), allowNull: true },
      brand: { type: DataTypes.STRING(80), allowNull: true },
      unit: { type: DataTypes.STRING(12), allowNull: false, defaultValue: "pcs" },
      allowDecimal: { type: DataTypes.BOOLEAN, defaultValue: false, field: "allow_decimal" },
      netQty: { type: DataTypes.STRING(40), allowNull: true, field: "net_qty" },
      hsnCode: { type: DataTypes.STRING(20), allowNull: true, field: "hsn_code" },
      taxRate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0, field: "tax_rate" },
      mrp: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      price: money({ validate: { min: 0 } }), // selling price
      costPrice: money({ field: "cost_price" }), // purchase price (for profit)
      quantity: qty(),
      reorderLevel: qty({ field: "reorder_level", defaultValue: 10 }),
      expiryDate: { type: DataTypes.DATEONLY, allowNull: true, field: "expiry_date" },
      batchNo: { type: DataTypes.STRING(60), allowNull: true, field: "batch_no" },
      location: { type: DataTypes.STRING(60), allowNull: true }, // rack / shelf
      supplierId: { type: DataTypes.INTEGER, allowNull: true, field: "supplier_id" },
      description: { type: DataTypes.TEXT, allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: "is_active" },
    },
    {
      tableName: "products",
      indexes: [
        { name: "ix_products_barcode", fields: ["barcode"] },
        { name: "ix_products_name", fields: ["name"] },
        { name: "ix_products_category", fields: ["category"] },
      ],
    },
  );

  const Supplier = sequelize.define(
    "Supplier",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      contactPerson: { type: DataTypes.STRING(100), allowNull: true, field: "contact_person" },
      phone: { type: DataTypes.STRING(20), allowNull: true },
      email: { type: DataTypes.STRING(120), allowNull: true },
      gstNumber: { type: DataTypes.STRING(20), allowNull: true, field: "gst_number" },
      address: { type: DataTypes.TEXT, allowNull: true },
      balance: money(), // amount WE owe the supplier
      notes: { type: DataTypes.TEXT, allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: "is_active" },
    },
    { tableName: "suppliers" },
  );

  const StockMovement = sequelize.define(
    "StockMovement",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      productId: { type: DataTypes.INTEGER, allowNull: false, field: "product_id" },
      productName: { type: DataTypes.STRING(180), allowNull: true, field: "product_name" },
      // sale | sale_cancel | return | purchase | purchase_cancel | adjustment | opening | import | scan
      type: { type: DataTypes.STRING(20), allowNull: false },
      quantity: qty(), // signed: + in, − out
      balanceAfter: qty({ field: "balance_after" }),
      reference: { type: DataTypes.STRING(60), allowNull: true },
      note: { type: DataTypes.STRING(255), allowNull: true },
      userName: { type: DataTypes.STRING(60), allowNull: true, field: "user_name" },
    },
    {
      tableName: "stock_movements",
      updatedAt: false,
      indexes: [{ name: "ix_movements_product", fields: ["product_id"] }],
    },
  );

  return { Product, Supplier, StockMovement };
};
