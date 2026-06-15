const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Maintenance = sequelize.define(
  'Maintenance',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    extinguisherId: { type: DataTypes.UUID, allowNull: false },
    extinguisherSerial: { type: DataTypes.STRING },
    inspector: { type: DataTypes.UUID, allowNull: false },
    inspectorName: { type: DataTypes.STRING },
    actionTaken: { type: DataTypes.TEXT, allowNull: false },
    maintenanceDate: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
    issuesIdentified: { type: DataTypes.TEXT },
    notes: { type: DataTypes.TEXT },
    recommendations: { type: DataTypes.TEXT },
    cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    nextMaintenanceDue: { type: DataTypes.DATEONLY },
  },
  { tableName: 'maintenances', underscored: false }
);

module.exports = Maintenance;
