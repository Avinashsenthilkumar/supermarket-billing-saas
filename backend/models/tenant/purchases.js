// models/tenant/purchases.js — Purchase, PurchaseItem, SupplierPayment
const { DataTypes } = require("sequelize");
const { money, qty } = require("./helpers");

module.exports = (sequelize) => {
  const Purchase = sequelize.define(
    "Purchase",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      purchaseNumber: { type: DataTypes.STRING(40), allowNull: false, field: "purchase_number" },
      supplierId: { type: DataTypes.INTEGER, allowNull: true, field: "supplier_id" },
      supplierName: { type: DataTypes.STRING(150), allowNull: true, field: "supplier_name" },
      invoiceNo: { type: DataTypes.STRING(60), allowNull: true, field: "invoice_no" },
      purchaseDate: { type: DataTypes.DATEONLY, allowNull: false, field: "purchase_date" },
      subtotal: money(),
      taxAmount: money({ field: "tax_amount" }),
      discountAmount: money({ field: "discount_amount" }),
      otherCharges: money({ field: "other_charges" }),
      totalAmount: money({ field: "total_amount" }),
      paidAmount: money({ field: "paid_amount" }),
      dueAmount: money({ field: "due_amount" }),
      paymentMethod: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "cash", field: "payment_method" },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "completed" },
      notes: { type: DataTypes.TEXT, allowNull: true },
      createdBy: { type: DataTypes.STRING(60), allowNull: true, field: "created_by" },
    },
    {
      tableName: "purchases",
      indexes: [
        { name: "uq_purchases_number", unique: true, fields: ["purchase_number"] },
        { name: "ix_purchases_supplier", fields: ["supplier_id"] },
      ],
    },
  );

  const PurchaseItem = sequelize.define(
    "PurchaseItem",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      purchaseId: { type: DataTypes.INTEGER, allowNull: false, field: "purchase_id" },
      productId: { type: DataTypes.INTEGER, allowNull: false, field: "product_id" },
      productName: { type: DataTypes.STRING(180), allowNull: false, field: "product_name" },
      quantity: qty(),
      costPrice: money({ field: "cost_price" }),
      taxRate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0, field: "tax_rate" },
      taxAmount: money({ field: "tax_amount" }),
      totalAmount: money({ field: "total_amount" }),
      mrp: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      sellingPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: "selling_price" },
      expiryDate: { type: DataTypes.DATEONLY, allowNull: true, field: "expiry_date" },
      batchNo: { type: DataTypes.STRING(60), allowNull: true, field: "batch_no" },
    },
    { tableName: "purchase_items", updatedAt: false, indexes: [{ name: "ix_pitems_purchase", fields: ["purchase_id"] }] },
  );

  const SupplierPayment = sequelize.define(
    "SupplierPayment",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      supplierId: { type: DataTypes.INTEGER, allowNull: false, field: "supplier_id" },
      purchaseId: { type: DataTypes.INTEGER, allowNull: true, field: "purchase_id" },
      amount: money(),
      method: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "cash" },
      reference: { type: DataTypes.STRING(80), allowNull: true },
      notes: { type: DataTypes.STRING(255), allowNull: true },
      createdBy: { type: DataTypes.STRING(60), allowNull: true, field: "created_by" },
    },
    { tableName: "supplier_payments", updatedAt: false },
  );

  return { Purchase, PurchaseItem, SupplierPayment };
};
