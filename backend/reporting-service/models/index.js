// Reporting service — read-only models for all shared tables
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Extinguisher = sequelize.define(
  'Extinguisher',
  {
    id: { type: DataTypes.UUID, primaryKey: true },
    serialNumber: DataTypes.STRING,
    location: DataTypes.STRING,
    type: DataTypes.STRING,
    size: DataTypes.STRING,
    installationDate: DataTypes.DATEONLY,
    expiryDate: DataTypes.DATEONLY,
    status: DataTypes.STRING,
    lastInspectionDate: DataTypes.DATEONLY,
    nextInspectionDate: DataTypes.DATEONLY,
    createdAt: DataTypes.DATE,
  },
  { tableName: 'extinguishers', underscored: false, timestamps: true }
);

const Inspection = sequelize.define(
  'Inspection',
  {
    id: { type: DataTypes.UUID, primaryKey: true },
    extinguisherId: DataTypes.UUID,
    extinguisherSerial: DataTypes.STRING,
    scheduledDate: DataTypes.DATEONLY,
    scheduledTime: DataTypes.STRING,
    status: DataTypes.STRING,
    result: DataTypes.STRING,
    inspectorName: DataTypes.STRING,
    completedAt: DataTypes.DATE,
    notes: DataTypes.TEXT,
    createdAt: DataTypes.DATE,
  },
  { tableName: 'inspections', underscored: false, timestamps: true }
);

const Maintenance = sequelize.define(
  'Maintenance',
  {
    id: { type: DataTypes.UUID, primaryKey: true },
    extinguisherId: DataTypes.UUID,
    extinguisherSerial: DataTypes.STRING,
    actionTaken: DataTypes.TEXT,
    maintenanceDate: DataTypes.DATEONLY,
    issuesIdentified: DataTypes.TEXT,
    inspectorName: DataTypes.STRING,
    cost: DataTypes.DECIMAL,
    createdAt: DataTypes.DATE,
  },
  { tableName: 'maintenances', underscored: false, timestamps: true }
);

const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.UUID, primaryKey: true },
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    email: DataTypes.STRING,
    role: DataTypes.STRING,
    isActive: DataTypes.BOOLEAN,
    createdAt: DataTypes.DATE,
  },
  { tableName: 'users', underscored: false, timestamps: true }
);

module.exports = { sequelize, Extinguisher, Inspection, Maintenance, User };
