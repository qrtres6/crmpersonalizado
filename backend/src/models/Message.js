const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Message = sequelize.define('Message', {
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
  ticketId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'ticket_id'
  },
  contactId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'contact_id'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'user_id'
  },
  connectionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'connection_id'
  },
  whatsappMessageId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'whatsapp_message_id'
  },
  body: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  messageType: {
    type: DataTypes.ENUM('text', 'image', 'video', 'audio', 'document', 'sticker', 'location', 'contact', 'template', 'interactive', 'reaction', 'system'),
    defaultValue: 'text',
    field: 'message_type'
  },
  direction: {
    type: DataTypes.ENUM('incoming', 'outgoing'),
    allowNull: false
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
  mediaSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'media_size'
  },
  mediaName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'media_name'
  },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'delivered', 'read', 'failed'),
    defaultValue: 'pending'
  },
  statusAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'status_at'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_message'
  },
  quotedMessageId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'quoted_message_id'
  },
  isInternal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_internal'
  },
  isFromBot: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_from_bot'
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  whatsappTimestamp: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'whatsapp_timestamp'
  }
}, {
  tableName: 'messages',
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['ticket_id'] },
    { fields: ['contact_id'] },
    { fields: ['whatsapp_message_id'] },
    { fields: ['direction'] },
    { fields: ['status'] },
    { fields: ['uuid'], unique: true }
  ]
});

module.exports = Message;
