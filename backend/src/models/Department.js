const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Department = sequelize.define('Department', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  uuid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    unique: true
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'tenant_id'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  color: {
    type: DataTypes.STRING(7),
    defaultValue: '#6366f1'
  },
  icon: {
    type: DataTypes.STRING(50),
    defaultValue: 'inbox'
  },
  settings: {
    type: DataTypes.JSON,
    defaultValue: {
      welcomeMessage: null,
      autoAssign: true,
      maxWaitTime: 300,
      priority: 1
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_default'
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'sort_order'
  },
  totalTickets: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_tickets'
  },
  openTickets: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'open_tickets'
  }
}, {
  tableName: 'departments',
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['status'] },
    { fields: ['uuid'], unique: true }
  ]
});

module.exports = Department;
