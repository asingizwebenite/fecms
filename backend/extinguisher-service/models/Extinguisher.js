const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Extinguisher = sequelize.define(
  'Extinguisher',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    serialNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
    location: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.ENUM('Water', 'CO2', 'Foam', 'Dry Chemical'), allowNull: false },
    size: { type: DataTypes.ENUM('1.5 lb', '5 lb', '9 lb', '12 lb'), allowNull: false },
    installationDate: { type: DataTypes.DATEONLY, allowNull: false },
    expiryDate: { type: DataTypes.DATEONLY, allowNull: false },
    status: {
      type: DataTypes.ENUM('Active', 'Expired', 'Under Maintenance', 'Decommissioned'),
      defaultValue: 'Active',
    },
    lastInspectionDate: { type: DataTypes.DATEONLY },
    nextInspectionDate: { type: DataTypes.DATEONLY },
    createdBy: { type: DataTypes.UUID },
    notes: { type: DataTypes.TEXT },
  },
  { tableName: 'extinguishers', underscored: false }
);

// Auto-mark as Expired on save if past expiry date
Extinguisher.beforeSave((extinguisher) => {
  if (extinguisher.expiryDate && new Date() > new Date(extinguisher.expiryDate) && extinguisher.status === 'Active') {
    extinguisher.status = 'Expired';
  }
});

module.exports = Extinguisher;
