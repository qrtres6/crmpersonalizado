const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Ticket = sequelize.define('Ticket', {
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
  contactId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'contact_id'
  },
  connectionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'connection_id'
  },
  departmentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'department_id'
  },
  assignedUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'assigned_user_id'
  },
  ticketNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'ticket_number'
  },
  status: {
    type: DataTypes.ENUM('pending', 'open', 'closed', 'resolved'),
    defaultValue: 'pending'
  },
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    defaultValue: 'normal'
  },
  lastMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'last_message'
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_message_at'
  },
  lastMessageType: {
    type: DataTypes.ENUM('incoming', 'outgoing'),
    allowNull: true,
    field: 'last_message_type'
  },
  unreadMessages: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'unread_messages'
  },
  whatsappChatId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'whatsapp_chat_id'
  },
  firstResponseAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'first_response_at'
  },
  closedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'closed_at'
  },
  closedByUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'closed_by_user_id'
  },
  closeReason: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'close_reason'
  },
  internalNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'internal_notes'
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  isBot: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_bot'
  },
  transferCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'transfer_count'
  }
}, {
  tableName: 'tickets',
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['contact_id'] },
    { fields: ['assigned_user_id'] },
    { fields: ['department_id'] },
    { fields: ['status'] },
    { fields: ['whatsapp_chat_id'] },
    { fields: ['tenant_id', 'ticket_number'], unique: true },
    { fields: ['uuid'], unique: true }
  ]
});

module.exports = Ticket;
