const jwt = require('jsonwebtoken');
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Minimal read-only reference to the shared users table for token invalidation checks
const UserRef = sequelize.define(
  'User',
  {
    id: { type: DataTypes.UUID, primaryKey: true },
    tokenVersion: { type: DataTypes.INTEGER },
    isActive: { type: DataTypes.BOOLEAN },
  },
  { tableName: 'users', timestamps: false }
);

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserRef.findByPk(decoded.id, { attributes: ['id', 'tokenVersion', 'isActive'] });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Account not found or has been deactivated' });
    }
    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. This action requires one of the following roles: ${roles.join(', ')}`,
    });
  }
  next();
};

module.exports = { authenticate, authorize };
