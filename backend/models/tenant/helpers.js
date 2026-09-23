// models/tenant/helpers.js — small column helpers shared by tenant models
const { DataTypes } = require("sequelize");

const money = (extra = {}) => ({
  type: DataTypes.DECIMAL(12, 2),
  allowNull: false,
  defaultValue: 0,
  ...extra,
});

const qty = (extra = {}) => ({
  type: DataTypes.DECIMAL(12, 3),
  allowNull: false,
  defaultValue: 0,
  ...extra,
});

// JSON stored in a TEXT column (portable across MySQL / MariaDB versions).
// `attr` must be the model attribute name the helper is assigned to.
const jsonText = (attr, fallback, extra = {}) => ({
  type: DataTypes.TEXT("long"),
  allowNull: true,
  get() {
    const raw = this.getDataValue(attr);
    if (raw === null || raw === undefined || raw === "") return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(value) {
    this.setDataValue(attr, value === undefined || value === null ? null : JSON.stringify(value));
  },
  ...extra,
});

module.exports = { money, qty, jsonText };
