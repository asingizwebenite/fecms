const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Inspection = sequelize.define(
  'Inspection',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    extinguisherId: { type: DataTypes.UUID, allowNull: false },
    extinguisherSerial: { type: DataTypes.STRING },
    scheduledDate: { type: DataTypes.DATEONLY, allowNull: false },
    scheduledTime: { type: DataTypes.STRING, allowNull: false },
    inspector: { type: DataTypes.UUID },
    inspectorName: { type: DataTypes.STRING },
    status: {
      type: DataTypes.ENUM('Pending', 'Completed', 'Overdue', 'Cancelled'),
      defaultValue: 'Pending',
    },
    notes: { type: DataTypes.TEXT },
    result: { type: DataTypes.ENUM('Pass', 'Fail', 'Needs Attention') },
    completedAt: { type: DataTypes.DATE },
    scheduledBy: { type: DataTypes.UUID },
  },
  { tableName: 'inspections', underscored: false }
);

module.exports = Inspection;
