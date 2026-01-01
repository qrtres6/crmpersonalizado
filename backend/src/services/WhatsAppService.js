const BaileysService = require('./BaileysService');
const MetaAPIService = require('./MetaAPIService');
const { WhatsAppConnection, Contact, Ticket, Message, Department } = require('../models');

class WhatsAppService {
  constructor() {
    this.io = null;
    this.setupBaileysListeners();
  }

  setIO(io) {
    this.io = io;
  }

  setupBaileysListeners() {
    BaileysService.on('qr', async ({ connectionId, tenantId, qr }) => {
      await WhatsAppConnection.update(
        { status: 'qr_pending' },
        { where: { id: connectionId } }
      );
      
      if (this.io) {
        this.io.to(`tenant:${tenantId}`).emit('whatsapp:qr', { connectionId, qr });
      }
    });

    BaileysService.on('connected', async ({ connectionId, tenantId, phoneNumber, name }) => {
      await WhatsAppConnection.update(
        { 
          status: 'connected', 
          phoneNumber, 
          lastConnected: new Date(),
          lastError: null 
        },
        { where: { id: connectionId } }
      );

      if (this.io) {
        this.io.to(`tenant:${tenantId}`).emit('whatsapp:connected', { connectionId, phoneNumber, name });
      }
    });

    BaileysService.on('disconnected', async ({ connectionId, tenantId, reason }) => {
      await WhatsAppConnection.update(
        { status: 'disconnected', lastError: `Desconectado: ${reason}` },
        { where: { id: connectionId } }
      );

      if (this.io) {
        this.io.to(`tenant:${tenantId}`).emit('whatsapp:disconnected', { connectionId, reason });
      }
    });

    BaileysService.on('message', async (data) => {
      await this.handleIncomingMessage(data, 'baileys');
    });

    BaileysService.on('message_status', async ({ connectionId, messageId, status }) => {
      await Message.update(
        { status, statusAt: new Date() },
        { where: { whatsappMessageId: messageId } }
      );
    });
  }

  async handleIncomingMessage({ connectionId, tenantId, phoneNumber, message, raw }, source) {
    try {
      const connection = await WhatsAppConnection.findByPk(connectionId);
      if (!connection) return;

      // Buscar o crear contacto
      let contact = await Contact.findOne({
        where: { tenantId, phoneNumber }
      });

      if (!contact) {
        contact = await Contact.create({
          tenantId,
          phoneNumber,
          name: message.contactName || phoneNumber,
          pushName: message.contactName,
          source: 'whatsapp'
        });
      } else if (message.contactName && contact.name === contact.phoneNumber) {
        await contact.update({ name: message.contactName, pushName: message.contactName });
      }

      // Buscar ticket abierto o crear uno nuevo
      let ticket = await Ticket.findOne({
        where: {
          tenantId,
          contactId: contact.id,
          status: ['pending', 'open']
        }
      });

      if (!ticket) {
        // Obtener departamento por defecto
        let departmentId = connection.settings?.defaultDepartmentId;
        if (!departmentId) {
          const defaultDept = await Department.findOne({
            where: { tenantId, isDefault: true }
          });
          departmentId = defaultDept?.id;
        }

        // Generar número de ticket
        const lastTicket = await Ticket.findOne({
          where: { tenantId },
          order: [['ticketNumber', 'DESC']]
        });
        const ticketNumber = (lastTicket?.ticketNumber || 1000) + 1;

        ticket = await Ticket.create({
          tenantId,
          contactId: contact.id,
          connectionId,
          departmentId,
          ticketNumber,
          status: 'pending',
          whatsappChatId: phoneNumber,
          lastMessage: message.body,
          lastMessageAt: new Date(),
          lastMessageType: 'incoming',
          unreadMessages: 1
        });

        // Notificar nuevo ticket
        if (this.io) {
          this.io.to(`tenant:${tenantId}`).emit('ticket:new', {
            ticket: await this.getTicketWithRelations(ticket.id)
          });
        }
      } else {
        // Actualizar ticket existente
        await ticket.update({
          lastMessage: message.body,
          lastMessageAt: new Date(),
          lastMessageType: 'incoming',
          unreadMessages: ticket.unreadMessages + 1
        });
      }

      // Crear mensaje
      const newMessage = await Message.create({
        tenantId,
        ticketId: ticket.id,
        contactId: contact.id,
        connectionId,
        whatsappMessageId: message.id,
        body: message.body,
        messageType: message.type,
        direction: 'incoming',
        status: 'received',
        mediaUrl: message.mediaUrl,
        mediaType: message.mediaType,
        whatsappTimestamp: new Date(message.timestamp * 1000)
      });

      // Actualizar stats del contacto
      await contact.update({
        totalMessages: contact.totalMessages + 1,
        lastContactAt: new Date()
      });

      // Incrementar mensajes recibidos de la conexión
      await connection.increment('messagesReceived');

      // Notificar nuevo mensaje
      if (this.io) {
        this.io.to(`ticket:${ticket.id}`).emit('message:new', {
          message: newMessage,
          ticket: { id: ticket.id, unreadMessages: ticket.unreadMessages + 1 }
        });

        this.io.to(`tenant:${tenantId}`).emit('ticket:updated', {
          ticketId: ticket.id,
          lastMessage: message.body,
          lastMessageAt: new Date(),
          unreadMessages: ticket.unreadMessages + 1
        });
      }

    } catch (error) {
      console.error('Error procesando mensaje entrante:', error);
    }
  }

  async getTicketWithRelations(ticketId) {
    return Ticket.findByPk(ticketId, {
      include: [
        { model: Contact, as: 'contact', attributes: ['id', 'name', 'phoneNumber', 'avatar'] },
        { model: require('../models/User'), as: 'assignedUser', attributes: ['id', 'name', 'avatar'] }
      ]
    });
  }

  async initializeConnection(connectionId) {
    const connection = await WhatsAppConnection.findByPk(connectionId);
    if (!connection) throw new Error('Conexión no encontrada');

    if (connection.type === 'baileys') {
      await connection.update({ status: 'connecting' });
      await BaileysService.createSession(connectionId, connection.tenantId);
    } else if (connection.type === 'meta') {
      MetaAPIService.registerConnection(connectionId, {
        metaPhoneId: connection.metaPhoneId,
        metaBusinessId: connection.metaBusinessId,
        metaAccessToken: connection.metaAccessToken,
        metaWebhookToken: connection.metaWebhookToken
      });
      await connection.update({ status: 'connected' });
    }

    return connection;
  }

  async disconnectConnection(connectionId) {
    const connection = await WhatsAppConnection.findByPk(connectionId);
    if (!connection) throw new Error('Conexión no encontrada');

    if (connection.type === 'baileys') {
      await BaileysService.logout(connectionId, connection.tenantId);
    }

    await connection.update({ status: 'disconnected' });
  }

  async sendMessage(connectionId, phoneNumber, content, userId = null, ticketId = null) {
    const connection = await WhatsAppConnection.findByPk(connectionId);
    if (!connection) throw new Error('Conexión no encontrada');

    let result;
    if (connection.type === 'baileys') {
      result = await BaileysService.sendMessage(connectionId, connection.tenantId, phoneNumber, content);
    } else if (connection.type === 'meta') {
      result = await MetaAPIService.sendMessage(connectionId, phoneNumber, content);
    }

    // Si hay ticket, crear registro del mensaje
    if (ticketId) {
      const ticket = await Ticket.findByPk(ticketId);
      if (ticket) {
        const body = typeof content === 'string' ? content : (content.text || content.caption || '');
        
        const message = await Message.create({
          tenantId: connection.tenantId,
          ticketId,
          contactId: ticket.contactId,
          connectionId,
          userId,
          whatsappMessageId: result.id,
          body,
          messageType: typeof content === 'string' ? 'text' : (content.type || 'text'),
          direction: 'outgoing',
          status: 'sent',
          mediaUrl: content.url,
          mediaType: content.mediaType
        });

        // Actualizar ticket
        await ticket.update({
          lastMessage: body,
          lastMessageAt: new Date(),
          lastMessageType: 'outgoing',
          unreadMessages: 0
        });

        // Si no tenía primera respuesta, marcarla
        if (!ticket.firstResponseAt && ticket.status === 'pending') {
          await ticket.update({ 
            firstResponseAt: new Date(),
            status: 'open'
          });
        }

        // Incrementar mensajes enviados
        await connection.increment('messagesSent');

        // Notificar
        if (this.io) {
          this.io.to(`ticket:${ticketId}`).emit('message:new', { message });
        }

        return { result, message };
      }
    }

    return { result };
  }

  async restoreAllConnections() {
    const connections = await WhatsAppConnection.findAll({
      where: { status: 'connected', type: 'baileys' }
    });

    for (const connection of connections) {
      try {
        await this.initializeConnection(connection.id);
        console.log(`✅ Conexión ${connection.id} restaurada`);
      } catch (error) {
        console.error(`❌ Error restaurando conexión ${connection.id}:`, error.message);
      }
    }

    // Registrar conexiones Meta
    const metaConnections = await WhatsAppConnection.findAll({
      where: { type: 'meta', metaAccessToken: { [require('sequelize').Op.ne]: null } }
    });

    for (const connection of metaConnections) {
      MetaAPIService.registerConnection(connection.id, {
        metaPhoneId: connection.metaPhoneId,
        metaBusinessId: connection.metaBusinessId,
        metaAccessToken: connection.metaAccessToken,
        metaWebhookToken: connection.metaWebhookToken
      });
    }
  }
}

module.exports = new WhatsAppService();
