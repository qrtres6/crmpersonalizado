const { sequelize } = require('../config/database');
const Tenant = require('./Tenant');
const User = require('./User');
const WhatsAppConnection = require('./WhatsAppConnection');
const Contact = require('./Contact');
const Department = require('./Department');
const Ticket = require('./Ticket');
const Message = require('./Message');
const { Tag, ContactTag, TicketTag } = require('./Tag');
const QuickReply = require('./QuickReply');

// Tenant -> Users
Tenant.hasMany(User, { foreignKey: 'tenantId', as: 'users' });
User.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

// Tenant -> WhatsAppConnections
Tenant.hasMany(WhatsAppConnection, { foreignKey: 'tenantId', as: 'connections' });
WhatsAppConnection.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

// Tenant -> Contacts
Tenant.hasMany(Contact, { foreignKey: 'tenantId', as: 'contacts' });
Contact.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

// Tenant -> Departments
Tenant.hasMany(Department, { foreignKey: 'tenantId', as: 'departments' });
Department.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

// Tenant -> Tickets
Tenant.hasMany(Ticket, { foreignKey: 'tenantId', as: 'tickets' });
Ticket.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

// Tenant -> Messages
Tenant.hasMany(Message, { foreignKey: 'tenantId', as: 'messages' });
Message.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

// Tenant -> Tags
Tenant.hasMany(Tag, { foreignKey: 'tenantId', as: 'tags' });
Tag.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

// Tenant -> QuickReplies
Tenant.hasMany(QuickReply, { foreignKey: 'tenantId', as: 'quickReplies' });
QuickReply.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

// Department -> Users (many to many)
const DepartmentUser = sequelize.define('DepartmentUser', {}, { tableName: 'department_users', timestamps: false });
Department.belongsToMany(User, { through: DepartmentUser, foreignKey: 'departmentId', as: 'users' });
User.belongsToMany(Department, { through: DepartmentUser, foreignKey: 'userId', as: 'departments' });

// Department -> Tickets
Department.hasMany(Ticket, { foreignKey: 'departmentId', as: 'tickets' });
Ticket.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// Department -> QuickReplies
Department.hasMany(QuickReply, { foreignKey: 'departmentId', as: 'quickReplies' });
QuickReply.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// Contact -> Tickets
Contact.hasMany(Ticket, { foreignKey: 'contactId', as: 'tickets' });
Ticket.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });

// Contact -> Messages
Contact.hasMany(Message, { foreignKey: 'contactId', as: 'messages' });
Message.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });

// Contact <-> Tags
Contact.belongsToMany(Tag, { through: ContactTag, foreignKey: 'contactId', as: 'tags' });
Tag.belongsToMany(Contact, { through: ContactTag, foreignKey: 'tagId', as: 'contacts' });

// User -> Tickets
User.hasMany(Ticket, { foreignKey: 'assignedUserId', as: 'assignedTickets' });
Ticket.belongsTo(User, { foreignKey: 'assignedUserId', as: 'assignedUser' });

// User -> Messages
User.hasMany(Message, { foreignKey: 'userId', as: 'messages' });
Message.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User -> QuickReplies
User.hasMany(QuickReply, { foreignKey: 'userId', as: 'quickReplies' });
QuickReply.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// WhatsAppConnection -> Tickets
WhatsAppConnection.hasMany(Ticket, { foreignKey: 'connectionId', as: 'tickets' });
Ticket.belongsTo(WhatsAppConnection, { foreignKey: 'connectionId', as: 'connection' });

// WhatsAppConnection -> Messages
WhatsAppConnection.hasMany(Message, { foreignKey: 'connectionId', as: 'messages' });
Message.belongsTo(WhatsAppConnection, { foreignKey: 'connectionId', as: 'connection' });

// Ticket -> Messages
Ticket.hasMany(Message, { foreignKey: 'ticketId', as: 'messages' });
Message.belongsTo(Ticket, { foreignKey: 'ticketId', as: 'ticket' });

// Ticket <-> Tags
Ticket.belongsToMany(Tag, { through: TicketTag, foreignKey: 'ticketId', as: 'tags' });
Tag.belongsToMany(Ticket, { through: TicketTag, foreignKey: 'tagId', as: 'tickets' });

// Message -> Message (quoted)
Message.belongsTo(Message, { foreignKey: 'quotedMessageId', as: 'quotedMessage' });
Message.hasMany(Message, { foreignKey: 'quotedMessageId', as: 'replies' });

const syncDatabase = async (options = {}) => {
  try {
    await sequelize.sync(options);
    console.log('✅ Base de datos sincronizada');
    return true;
  } catch (error) {
    console.error('❌ Error sincronizando base de datos:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  Tenant,
  User,
  WhatsAppConnection,
  Contact,
  Department,
  Ticket,
  Message,
  Tag,
  ContactTag,
  TicketTag,
  QuickReply,
  DepartmentUser,
  syncDatabase
};
