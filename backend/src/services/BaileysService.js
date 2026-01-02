const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const EventEmitter = require('events');

class BaileysService extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
    this.sessionsPath = path.join(__dirname, '../../sessions');
    if (!fs.existsSync(this.sessionsPath)) {
      fs.mkdirSync(this.sessionsPath, { recursive: true });
    }
  }

  async createSession(connectionId, tenantId) {
    const sessionId = tenantId + '_' + connectionId;
    const sessionPath = path.join(this.sessionsPath, sessionId);
    if (this.sessions.has(sessionId)) return this.sessions.get(sessionId);
    
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      browser: ['CRM Apuestas', 'Chrome', '120.0'],
      syncFullHistory: false,
      markOnlineOnConnect: true,
    });

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
          setTimeout(() => { this.createSession(connectionId, tenantId); }, 3000);
        }
        this.emit('disconnected', { sessionId, connectionId, tenantId, reason });
      } else if (connection === 'open') {
        const phoneNumber = socket.user?.id?.split(':')[0] || socket.user?.id?.split('@')[0];
        this.emit('connected', { sessionId, connectionId, tenantId, phoneNumber, name: socket.user?.name });
      }
    });

    socket.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const message of messages) {
        if (message.key.fromMe) continue;
        const phoneNumber = message.key.remoteJid.split('@')[0];
        const messageData = this.parseMessage(message);
        this.emit('message', { sessionId, connectionId, tenantId, phoneNumber, message: messageData, raw: message });
      }
    });

    this.sessions.set(sessionId, socket);
    return socket;
  }

  parseMessage(message) {
    const msg = message.message;
    if (!msg) return null;
    let type = 'text', body = '', caption = null;
    if (msg.conversation) body = msg.conversation;
    else if (msg.extendedTextMessage) body = msg.extendedTextMessage.text;
    else if (msg.imageMessage) { type = 'image'; caption = msg.imageMessage.caption; }
    else if (msg.videoMessage) { type = 'video'; caption = msg.videoMessage.caption; }
    else if (msg.audioMessage) type = 'audio';
    else if (msg.documentMessage) { type = 'document'; body = msg.documentMessage.fileName; }
    return { id: message.key.id, type, body: body || caption || '', timestamp: message.messageTimestamp, fromMe: message.key.fromMe };
  }

  async sendMessage(connectionId, tenantId, phoneNumber, content) {
    const sessionId = tenantId + '_' + connectionId;
    const socket = this.sessions.get(sessionId);
    if (!socket) throw new Error('Sesion no encontrada');
    const jid = phoneNumber.includes('@') ? phoneNumber : phoneNumber + '@s.whatsapp.net';
    const messageContent = typeof content === 'string' ? { text: content } : { text: content.text || String(content) };
    const result = await socket.sendMessage(jid, messageContent);
    return { id: result.key.id, status: 'sent', timestamp: Date.now() };
  }

  async deleteSession(connectionId, tenantId) {
    const sessionId = tenantId + '_' + connectionId;
    const socket = this.sessions.get(sessionId);
    if (socket) { socket.end(); this.sessions.delete(sessionId); }
    const sessionPath = path.join(this.sessionsPath, sessionId);
    if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true });
  }

  async logout(connectionId, tenantId) {
    const sessionId = tenantId + '_' + connectionId;
    const socket = this.sessions.get(sessionId);
    if (socket) { await socket.logout(); await this.deleteSession(connectionId, tenantId); }
  }

  isConnected(connectionId, tenantId) {
    const socket = this.sessions.get(tenantId + '_' + connectionId);
    return socket?.user ? true : false;
  }
}

module.exports = new BaileysService();
