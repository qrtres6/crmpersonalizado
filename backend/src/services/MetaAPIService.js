const axios = require('axios');
const EventEmitter = require('events');

class MetaAPIService extends EventEmitter {
  constructor() {
    super();
    this.baseUrl = 'https://graph.facebook.com/v18.0';
    this.connections = new Map();
  }

  registerConnection(connectionId, config) {
    this.connections.set(connectionId, {
      phoneNumberId: config.metaPhoneId,
      businessId: config.metaBusinessId,
      accessToken: config.metaAccessToken,
      webhookToken: config.metaWebhookToken
    });
    console.log('Meta conexión registrada:', connectionId);
  }

  async sendMessage(connectionId, phoneNumber, content) {
    const conn = this.connections.get(connectionId);
    if (!conn) throw new Error('Conexión no configurada');

    const url = this.baseUrl + '/' + conn.phoneNumberId + '/messages';
    let messageData;

    if (typeof content === 'string') {
      messageData = { messaging_product: 'whatsapp', to: phoneNumber, type: 'text', text: { body: content } };
    } else if (content.type === 'template') {
      messageData = { messaging_product: 'whatsapp', to: phoneNumber, type: 'template', template: { name: content.templateName, language: { code: content.language || 'es' }, components: content.components || [] } };
    } else if (content.type === 'image') {
      messageData = { messaging_product: 'whatsapp', to: phoneNumber, type: 'image', image: { link: content.url, caption: content.caption } };
    } else if (content.type === 'document') {
      messageData = { messaging_product: 'whatsapp', to: phoneNumber, type: 'document', document: { link: content.url, filename: content.fileName, caption: content.caption } };
    } else {
      messageData = { messaging_product: 'whatsapp', to: phoneNumber, type: 'text', text: { body: content.text || String(content) } };
    }

    try {
      const response = await axios.post(url, messageData, { headers: { 'Authorization': 'Bearer ' + conn.accessToken, 'Content-Type': 'application/json' } });
      return { id: response.data.messages[0].id, status: 'sent', timestamp: Date.now() };
    } catch (error) {
      console.error('Error enviando mensaje Meta:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'Error enviando mensaje');
    }
  }

  async processWebhook(connectionId, value) {
    const { WhatsAppConnection } = require('../models');
    const WhatsAppService = require('./WhatsAppService');
    
    const connection = await WhatsAppConnection.findByPk(connectionId);
    if (!connection) return;

    // Procesar mensajes entrantes
    if (value.messages) {
      for (const message of value.messages) {
        const contact = value.contacts?.find(c => c.wa_id === message.from);
        const parsedMessage = this.parseMessage(message);
        
        await WhatsAppService.handleIncomingMessage({
          connectionId,
          tenantId: connection.tenantId,
          phoneNumber: message.from,
          message: { ...parsedMessage, contactName: contact?.profile?.name },
          raw: message
        }, 'meta');
      }
    }

    // Procesar estados de mensajes
    if (value.statuses) {
      const { Message } = require('../models');
      for (const status of value.statuses) {
        await Message.update({ status: status.status, statusAt: new Date() }, { where: { whatsappMessageId: status.id } });
      }
    }
  }

  parseMessage(message) {
    let type = message.type;
    let body = '';
    let mediaId = null;

    switch (type) {
      case 'text': body = message.text.body; break;
      case 'image': mediaId = message.image.id; body = message.image.caption || ''; break;
      case 'video': mediaId = message.video.id; body = message.video.caption || ''; break;
      case 'audio': mediaId = message.audio.id; break;
      case 'document': mediaId = message.document.id; body = message.document.filename || ''; break;
      case 'location': body = JSON.stringify({ lat: message.location.latitude, lng: message.location.longitude }); break;
      case 'interactive':
        if (message.interactive?.button_reply) body = message.interactive.button_reply.title;
        else if (message.interactive?.list_reply) body = message.interactive.list_reply.title;
        break;
    }

    return { id: message.id, type, body, mediaId, timestamp: parseInt(message.timestamp), fromMe: false };
  }

  async markAsRead(connectionId, messageId) {
    const conn = this.connections.get(connectionId);
    if (!conn) return;
    try {
      await axios.post(this.baseUrl + '/' + conn.phoneNumberId + '/messages', { messaging_product: 'whatsapp', status: 'read', message_id: messageId }, { headers: { 'Authorization': 'Bearer ' + conn.accessToken, 'Content-Type': 'application/json' } });
    } catch (error) {
      console.error('Error marcando como leído:', error.message);
    }
  }
}

module.exports = new MetaAPIService();
