// Auth service reads from the shared users table — read-only access
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.UUID, primaryKey: true },
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    email: { type: DataTypes.STRING, unique: true },
    password: DataTypes.STRING,
    role: DataTypes.STRING,
    isActive: DataTypes.BOOLEAN,
    isAccountActivated: DataTypes.BOOLEAN,
  },
  { tableName: 'users', underscored: false }
);

User.prototype.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = User;
