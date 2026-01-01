const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Contact = sequelize.define('Contact', {
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
    type: DataTypes.STRING(150),
    allowNull: false
  },
  phoneNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'phone_number'
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  avatar: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  pushName: {
    type: DataTypes.STRING(150),
    allowNull: true,
    field: 'push_name'
  },
  isWhatsAppValid: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_whatsapp_valid'
  },
  customFields: {
    type: DataTypes.JSON,
    defaultValue: {},
    field: 'custom_fields'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'blocked', 'archived'),
    defaultValue: 'active'
  },
  source: {
    type: DataTypes.STRING(50),
    defaultValue: 'whatsapp'
  },
  totalTickets: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_tickets'
  },
  totalMessages: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_messages'
  },
  lastContactAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_contact_at'
  },
  acceptsMarketing: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'accepts_marketing'
  }
}, {
  tableName: 'contacts',
  indexes: [
    { fields: ['tenant_id', 'phone_number'], unique: true },
    { fields: ['tenant_id'] },
    { fields: ['phone_number'] },
    { fields: ['status'] },
    { fields: ['uuid'], unique: true }
  ]
});

module.exports = Contact;
