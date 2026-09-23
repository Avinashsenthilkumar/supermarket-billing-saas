// models/master/PlatformSetting.js — single row (id = 1) holding platform-wide settings as JSON
const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/database");

const PlatformSetting = sequelize.define(
  "PlatformSetting",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, defaultValue: 1 },
    data: {
      // MySQL does not allow DEFAULT on TEXT columns — null is treated as {}
      type: DataTypes.TEXT("long"),
      allowNull: true,
      get() {
        try {
          return JSON.parse(this.getDataValue("data") || "{}");
        } catch {
          return {};
        }
      },
      set(v) {
        this.setDataValue("data", JSON.stringify(v || {}));
      },
    },
  },
  { tableName: "platform_settings" },
);

module.exports = PlatformSetting;