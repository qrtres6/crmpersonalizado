const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Tag = sequelize.define('Tag', {
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
    type: DataTypes.STRING(50),
    allowNull: false
  },
  color: {
    type: DataTypes.STRING(7),
    defaultValue: '#6366f1'
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'tags',
  indexes: [
    { fields: ['tenant_id', 'name'], unique: true },
    { fields: ['uuid'], unique: true }
  ]
});

const ContactTag = sequelize.define('ContactTag', {
  contactId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    field: 'contact_id'
  },
  tagId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    field: 'tag_id'
  }
}, {
  tableName: 'contact_tags',
  timestamps: false
});

const TicketTag = sequelize.define('TicketTag', {
  ticketId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    field: 'ticket_id'
  },
  tagId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    field: 'tag_id'
  }
}, {
  tableName: 'ticket_tags',
  timestamps: false
});

module.exports = { Tag, ContactTag, TicketTag };
