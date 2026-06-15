const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    firstName: { type: DataTypes.STRING, allowNull: false },
    lastName: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('Admin', 'Inspector', 'User'), defaultValue: 'User' },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    otp: { type: DataTypes.STRING },
    otpExpiry: { type: DataTypes.DATE },
    isAccountActivated: { type: DataTypes.BOOLEAN, defaultValue: false },
    resetPasswordToken: { type: DataTypes.STRING },
    resetPasswordExpiry: { type: DataTypes.DATE },
    profileImage: { type: DataTypes.STRING },
    tokenVersion: { type: DataTypes.INTEGER, defaultValue: 1, allowNull: false },
  },
  { tableName: 'users', underscored: false }
);

User.beforeSave(async (user) => {
  if (user.changed('password')) {
    user.password = await bcrypt.hash(user.password, 12);
  }
});

User.prototype.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

User.prototype.toSafeObject = function () {
  const { password, otp, otpExpiry, resetPasswordToken, resetPasswordExpiry, ...safe } = this.toJSON();
  return safe;
};

module.exports = User;
