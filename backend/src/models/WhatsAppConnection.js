const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WhatsAppConnection = sequelize.define('WhatsAppConnection', {
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
  type: {
    type: DataTypes.ENUM('baileys', 'meta'),
    allowNull: false
  },
  phoneNumber: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'phone_number'
  },
  sessionData: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    field: 'session_data'
  },
  metaPhoneId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'meta_phone_id'
  },
  metaBusinessId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'meta_business_id'
  },
  metaAccessToken: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'meta_access_token'
  },
  metaWebhookToken: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'meta_webhook_token'
  },
  status: {
    type: DataTypes.ENUM('disconnected', 'connecting', 'qr_pending', 'connected', 'error'),
    defaultValue: 'disconnected'
  },
  lastError: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'last_error'
  },
  lastConnected: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_connected'
  },
  settings: {
    type: DataTypes.JSON,
    defaultValue: {
      autoRead: true,
      autoTyping: true,
      typingDelay: 1500,
      receiveGroups: false,
      receiveStatus: false,
      defaultDepartmentId: null
    }
  },
  messagesSent: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'messages_sent'
  },
  messagesReceived: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'messages_received'
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_default'
  }
}, {
  tableName: 'whatsapp_connections',
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['uuid'], unique: true }
  ]
});

module.exports = WhatsAppConnection;
