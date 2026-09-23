// models/master/index.js
const { sequelize } = require("../../config/database");
const Shop = require("./Shop");
const User = require("./User");
const PlatformSetting = require("./PlatformSetting");

Shop.hasMany(User, { foreignKey: "shopId", as: "users", onDelete: "CASCADE" });
User.belongsTo(Shop, { foreignKey: "shopId", as: "shop" });

module.exports = { sequelize, Shop, User, PlatformSetting };
