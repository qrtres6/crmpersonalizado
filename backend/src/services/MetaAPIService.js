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
  }

  getConnection(connectionId) {
    return this.connections.get(connectionId);
  }

  async sendMessage(connectionId, phoneNumber, content) {
    const conn = this.connections.get(connectionId);
    if (!conn) {
      throw new Error('Conexión no configurada');
    }

    const url = `${this.baseUrl}/${conn.phoneNumberId}/messages`;
    
    let messageData;
    if (typeof content === 'string') {
      messageData = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: { body: content }
      };
    } else if (content.type === 'template') {
      messageData = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'template',
        template: {
          name: content.templateName,
          language: { code: content.language || 'es' },
          components: content.components || []
        }
      };
    } else if (content.type === 'image') {
      messageData = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'image',
        image: { 
          link: content.url,
          caption: content.caption 
        }
      };
    } else if (content.type === 'video') {
      messageData = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'video',
        video: { 
          link: content.url,
          caption: content.caption 
        }
      };
    } else if (content.type === 'audio') {
      messageData = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'audio',
        audio: { link: content.url }
      };
    } else if (content.type === 'document') {
      messageData = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'document',
        document: { 
          link: content.url,
          filename: content.fileName,
          caption: content.caption 
        }
      };
    } else if (content.type === 'interactive') {
      messageData = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'interactive',
        interactive: content.interactive
      };
    } else {
      messageData = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: { body: content.text || String(content) }
      };
    }

    try {
      const response = await axios.post(url, messageData, {
        headers: {
          'Authorization': `Bearer ${conn.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        id: response.data.messages[0].id,
        status: 'sent',
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error enviando mensaje Meta:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'Error enviando mensaje');
    }
  }

  async sendTemplate(connectionId, phoneNumber, templateName, language = 'es', components = []) {
    return this.sendMessage(connectionId, phoneNumber, {
      type: 'template',
      templateName,
      language,
      components
    });
  }

  async markAsRead(connectionId, messageId) {
    const conn = this.connections.get(connectionId);
    if (!conn) return;

    const url = `${this.baseUrl}/${conn.phoneNumberId}/messages`;
    
    try {
      await axios.post(url, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      }, {
        headers: {
          'Authorization': `Bearer ${conn.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error marcando como leído:', error.message);
    }
  }

  async getMediaUrl(connectionId, mediaId) {
    const conn = this.connections.get(connectionId);
    if (!conn) {
      throw new Error('Conexión no configurada');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/${mediaId}`, {
        headers: {
          'Authorization': `Bearer ${conn.accessToken}`
        }
      });
      return response.data.url;
    } catch (error) {
      console.error('Error obteniendo media:', error.message);
      throw error;
    }
  }

  async downloadMedia(connectionId, mediaId) {
    const conn = this.connections.get(connectionId);
    const mediaUrl = await this.getMediaUrl(connectionId, mediaId);

    const response = await axios.get(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${conn.accessToken}`
      },
      responseType: 'arraybuffer'
    });

    return response.data;
  }

  processWebhook(body, connectionId, tenantId) {
    if (!body.entry) return null;

    const messages = [];
    const statuses = [];

    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;

        // Procesar mensajes entrantes
        if (value.messages) {
          for (const message of value.messages) {
            const contact = value.contacts?.find(c => c.wa_id === message.from);
            
            messages.push({
              connectionId,
              tenantId,
              phoneNumber: message.from,
              contactName: contact?.profile?.name || message.from,
              message: this.parseWebhookMessage(message)
            });
          }
        }

        // Procesar actualizaciones de estado
        if (value.statuses) {
          for (const status of value.statuses) {
            statuses.push({
              connectionId,
              tenantId,
              messageId: status.id,
              phoneNumber: status.recipient_id,
              status: status.status,
              timestamp: status.timestamp
            });
          }
        }
      }
    }

    return { messages, statuses };
  }

  parseWebhookMessage(message) {
    let type = message.type;
    let body = '';
    let mediaId = null;
    let caption = null;
    let latitude = null;
    let longitude = null;

    switch (type) {
      case 'text':
        body = message.text.body;
        break;
      case 'image':
        mediaId = message.image.id;
        caption = message.image.caption;
        break;
      case 'video':
        mediaId = message.video.id;
        caption = message.video.caption;
        break;
      case 'audio':
        mediaId = message.audio.id;
        break;
      case 'document':
        mediaId = message.document.id;
        body = message.document.filename;
        caption = message.document.caption;
        break;
      case 'sticker':
        mediaId = message.sticker.id;
        break;
      case 'location':
        latitude = message.location.latitude;
        longitude = message.location.longitude;
        body = JSON.stringify({ latitude, longitude });
        break;
      case 'contacts':
        body = JSON.stringify(message.contacts);
        break;
      case 'interactive':
        if (message.interactive.type === 'button_reply') {
          body = message.interactive.button_reply.title;
        } else if (message.interactive.type === 'list_reply') {
          body = message.interactive.list_reply.title;
        }
        break;
      case 'button':
        body = message.button.text;
        break;
    }

    return {
      id: message.id,
      type,
      body: body || caption || '',
      caption,
      mediaId,
      timestamp: parseInt(message.timestamp),
      fromMe: false
    };
  }

  verifyWebhook(mode, token, challenge, expectedToken) {
    if (mode === 'subscribe' && token === expectedToken) {
      return challenge;
    }
    return null;
  }
}

module.exports = new MetaAPIService();
