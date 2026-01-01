const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const QuickReply = sequelize.define('QuickReply', {
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
  departmentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'department_id'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'user_id'
  },
  shortcut: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  hasMedia: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'has_media'
  },
  mediaUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'media_url'
  },
  mediaType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'media_type'
  },
  usageCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'usage_count'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  }
}, {
  tableName: 'quick_replies',
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['tenant_id', 'shortcut'] },
    { fields: ['department_id'] },
    { fields: ['uuid'], unique: true }
  ]
});

module.exports = QuickReply;
