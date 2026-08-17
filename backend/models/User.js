// models/User.js
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  // ── Multi-tenant key ──────────────────────────────────────────────
  shopId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'shop_id',
    references: { model: 'shops', key: 'id' },
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    // NOTE: no longer globally unique — two different shops may both
    // have a user called "admin". Uniqueness is enforced per shop below.
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true, // email is the global login identifier
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('owner', 'staff'),
    defaultValue: 'owner',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'users',
  indexes: [
    // username unique *within* a shop
    { unique: true, fields: ['shop_id', 'username'] },
  ],
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
  },
});

// Instance method to compare passwords
User.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;
