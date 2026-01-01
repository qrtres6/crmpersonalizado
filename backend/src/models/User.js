const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
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
    allowNull: true,
    field: 'tenant_id'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  avatar: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('super_admin', 'admin', 'supervisor', 'agent'),
    defaultValue: 'agent'
  },
  permissions: {
    type: DataTypes.JSON,
    defaultValue: {
      tickets: { view: true, create: true, edit: true, delete: false, transfer: true },
      contacts: { view: true, create: true, edit: true, delete: false, import: false },
      campaigns: { view: false, create: false, edit: false, delete: false },
      reports: { view: false, export: false },
      settings: { view: false, edit: false },
      users: { view: false, create: false, edit: false, delete: false },
      connections: { view: false, create: false, edit: false, delete: false }
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'away', 'busy'),
    defaultValue: 'active'
  },
  isOnline: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_online'
  },
  lastSeen: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_seen'
  },
  maxTickets: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
    field: 'max_tickets'
  },
  currentTickets: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'current_tickets'
  },
  totalTicketsHandled: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_tickets_handled'
  },
  settings: {
    type: DataTypes.JSON,
    defaultValue: {
      notifications: { sound: true, desktop: true, newTicket: true, newMessage: true },
      theme: 'dark'
    }
  },
  tokenVersion: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'token_version'
  }
}, {
  tableName: 'users',
  indexes: [
    { fields: ['email', 'tenant_id'], unique: true },
    { fields: ['tenant_id'] },
    { fields: ['role'] },
    { fields: ['uuid'], unique: true }
  ],
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

User.prototype.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toSafeObject = function() {
  const { password, tokenVersion, ...safeUser } = this.toJSON();
  return safeUser;
};

module.exports = User;
