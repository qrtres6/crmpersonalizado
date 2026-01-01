const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, makeInMemoryStore } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const EventEmitter = require('events');

class BaileysService extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
    this.stores = new Map();
    this.sessionsPath = path.join(__dirname, '../../sessions');
    
    if (!fs.existsSync(this.sessionsPath)) {
      fs.mkdirSync(this.sessionsPath, { recursive: true });
    }
  }

  async createSession(connectionId, tenantId) {
    const sessionId = `${tenantId}_${connectionId}`;
    const sessionPath = path.join(this.sessionsPath, sessionId);

    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId);
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const store = makeInMemoryStore({});
    this.stores.set(sessionId, store);

    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      browser: ['CRM Apuestas', 'Chrome', '120.0'],
      syncFullHistory: false,
      markOnlineOnConnect: true,
    });

    store.bind(socket.ev);

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        const qrCode = await QRCode.toDataURL(qr);
        this.emit('qr', { sessionId, connectionId, tenantId, qr: qrCode });
      }

      if (connection === 'close') {
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
        
        if (reason === DisconnectReason.loggedOut) {
          this.emit('logged_out', { sessionId, connectionId, tenantId });
          await this.deleteSession(connectionId, tenantId);
        } else if (reason !== DisconnectReason.connectionClosed) {
          // Reconectar
          setTimeout(() => {
            this.createSession(connectionId, tenantId);
          }, 3000);
        }
        
        this.emit('disconnected', { sessionId, connectionId, tenantId, reason });
      } else if (connection === 'open') {
        const phoneNumber = socket.user?.id?.split(':')[0] || socket.user?.id?.split('@')[0];
        this.emit('connected', { 
          sessionId, 
          connectionId, 
          tenantId, 
          phoneNumber,
          name: socket.user?.name 
        });
      }
    });

    socket.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const message of messages) {
        if (message.key.fromMe) continue;
        
        const phoneNumber = message.key.remoteJid.split('@')[0];
        const messageData = this.parseMessage(message);
        
        this.emit('message', {
          sessionId,
          connectionId,
          tenantId,
          phoneNumber,
          message: messageData,
          raw: message
        });
      }
    });

    socket.ev.on('messages.update', (updates) => {
      for (const update of updates) {
        if (update.update.status) {
          this.emit('message_status', {
            sessionId,
            connectionId,
            tenantId,
            messageId: update.key.id,
            status: this.getStatusName(update.update.status)
          });
        }
      }
    });

    this.sessions.set(sessionId, socket);
    return socket;
  }

  parseMessage(message) {
    const msg = message.message;
    if (!msg) return null;

    let type = 'text';
    let body = '';
    let mediaUrl = null;
    let mediaType = null;
    let caption = null;

    if (msg.conversation) {
      body = msg.conversation;
    } else if (msg.extendedTextMessage) {
      body = msg.extendedTextMessage.text;
    } else if (msg.imageMessage) {
      type = 'image';
      caption = msg.imageMessage.caption;
      mediaType = msg.imageMessage.mimetype;
    } else if (msg.videoMessage) {
      type = 'video';
      caption = msg.videoMessage.caption;
      mediaType = msg.videoMessage.mimetype;
    } else if (msg.audioMessage) {
      type = 'audio';
      mediaType = msg.audioMessage.mimetype;
    } else if (msg.documentMessage) {
      type = 'document';
      body = msg.documentMessage.fileName;
      mediaType = msg.documentMessage.mimetype;
    } else if (msg.stickerMessage) {
      type = 'sticker';
    } else if (msg.locationMessage) {
      type = 'location';
      body = JSON.stringify({
        latitude: msg.locationMessage.degreesLatitude,
        longitude: msg.locationMessage.degreesLongitude
      });
    } else if (msg.contactMessage) {
      type = 'contact';
      body = msg.contactMessage.displayName;
    }

    return {
      id: message.key.id,
      type,
      body: body || caption || '',
      caption,
      mediaType,
      timestamp: message.messageTimestamp,
      fromMe: message.key.fromMe,
      chatId: message.key.remoteJid
    };
  }

  getStatusName(status) {
    const statusMap = {
      0: 'error',
      1: 'pending',
      2: 'sent',
      3: 'delivered',
      4: 'read'
    };
    return statusMap[status] || 'unknown';
  }

  async sendMessage(connectionId, tenantId, phoneNumber, content) {
    const sessionId = `${tenantId}_${connectionId}`;
    const socket = this.sessions.get(sessionId);

    if (!socket) {
      throw new Error('Sesión no encontrada');
    }

    const jid = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;

    let messageContent;
    if (typeof content === 'string') {
      messageContent = { text: content };
    } else if (content.type === 'image') {
      messageContent = { 
        image: { url: content.url }, 
        caption: content.caption 
      };
    } else if (content.type === 'video') {
      messageContent = { 
        video: { url: content.url }, 
        caption: content.caption 
      };
    } else if (content.type === 'audio') {
      messageContent = { 
        audio: { url: content.url }, 
        ptt: content.ptt || false 
      };
    } else if (content.type === 'document') {
      messageContent = { 
        document: { url: content.url }, 
        fileName: content.fileName,
        mimetype: content.mimetype 
      };
    } else {
      messageContent = { text: content.text || content };
    }

    const result = await socket.sendMessage(jid, messageContent);
    return {
      id: result.key.id,
      status: 'sent',
      timestamp: Date.now()
    };
  }

  async getSession(connectionId, tenantId) {
    const sessionId = `${tenantId}_${connectionId}`;
    return this.sessions.get(sessionId);
  }

  async deleteSession(connectionId, tenantId) {
    const sessionId = `${tenantId}_${connectionId}`;
    const socket = this.sessions.get(sessionId);

    if (socket) {
      socket.end();
      this.sessions.delete(sessionId);
    }

    this.stores.delete(sessionId);

    const sessionPath = path.join(this.sessionsPath, sessionId);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
  }

  async logout(connectionId, tenantId) {
    const sessionId = `${tenantId}_${connectionId}`;
    const socket = this.sessions.get(sessionId);

    if (socket) {
      await socket.logout();
      await this.deleteSession(connectionId, tenantId);
    }
  }

  isConnected(connectionId, tenantId) {
    const sessionId = `${tenantId}_${connectionId}`;
    const socket = this.sessions.get(sessionId);
    return socket?.user ? true : false;
  }

  getConnectionInfo(connectionId, tenantId) {
    const sessionId = `${tenantId}_${connectionId}`;
    const socket = this.sessions.get(sessionId);
    
    if (!socket?.user) return null;
    
    return {
      phoneNumber: socket.user.id.split(':')[0] || socket.user.id.split('@')[0],
      name: socket.user.name,
      connected: true
    };
  }
}

module.exports = new BaileysService();
