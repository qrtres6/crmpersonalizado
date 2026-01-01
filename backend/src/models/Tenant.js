const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Tenant = sequelize.define('Tenant', {
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
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  logo: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  primaryColor: {
    type: DataTypes.STRING(7),
    defaultValue: '#6366f1',
    field: 'primary_color'
  },
  secondaryColor: {
    type: DataTypes.STRING(7),
    defaultValue: '#4f46e5',
    field: 'secondary_color'
  },
  settings: {
    type: DataTypes.JSON,
    defaultValue: {
      timezone: 'America/Argentina/Buenos_Aires',
      language: 'es',
      welcomeMessage: '¡Hola! ¿En qué podemos ayudarte?',
      awayMessage: 'En este momento no hay agentes disponibles.',
      maxTicketsPerAgent: 10,
      autoAssign: true
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    defaultValue: 'active'
  },
  plan: {
    type: DataTypes.ENUM('free', 'basic', 'pro', 'enterprise'),
    defaultValue: 'pro'
  },
  maxUsers: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
    field: 'max_users'
  },
  maxConnections: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    field: 'max_connections'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expires_at'
  }
}, {
  tableName: 'tenants',
  indexes: [
    { fields: ['slug'], unique: true },
    { fields: ['status'] },
    { fields: ['uuid'], unique: true }
  ]
});

module.exports = Tenant;
