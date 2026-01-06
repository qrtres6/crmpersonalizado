const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

class WhatsAppClient {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.qrCode = null;
    this.phoneNumber = null;
    this.eventHandlers = {};
  }

  on(event, handler) {
    this.eventHandlers[event] = handler;
  }

  emit(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event](data);
    }
  }

  async connect() {
    const sessionPath = path.join(__dirname, '..', 'sessions', 'main');

    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    this.socket = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
      logger: pino({ level: 'silent' }),
      browser: ['WhatsApp Automation', 'Chrome', '120.0.0'],
      syncFullHistory: false,
      markOnlineOnConnect: true
    });

    this.socket.ev.on('creds.update', saveCreds);

    this.socket.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qrCode = qr;
        this.emit('qr', qr);
        console.log('\n📱 Escanea el código QR con WhatsApp\n');
      }

      if (connection === 'close') {
        this.isConnected = false;
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log('❌ Conexión cerrada:', lastDisconnect?.error?.message);
        this.emit('disconnected', { reason: lastDisconnect?.error?.message });

        if (shouldReconnect) {
          console.log('🔄 Reconectando...');
          setTimeout(() => this.connect(), 3000);
        }
      }

      if (connection === 'open') {
        this.isConnected = true;
        this.qrCode = null;
        this.phoneNumber = this.socket.user?.id?.split(':')[0];
        console.log('✅ Conectado como:', this.phoneNumber);
        this.emit('connected', { phoneNumber: this.phoneNumber });
      }
    });

    this.socket.ev.on('messages.upsert', async (m) => {
      const message = m.messages[0];
      if (!message.key.fromMe && m.type === 'notify') {
        this.emit('message', message);
      }
    });

    return this.socket;
  }

  async disconnect() {
    if (this.socket) {
      await this.socket.logout();
      this.isConnected = false;
      this.socket = null;
    }
  }

  // ==================== MENSAJES ====================

  async sendMessage(phoneNumber, message) {
    if (!this.isConnected) throw new Error('No conectado a WhatsApp');

    const jid = this.formatJid(phoneNumber);
    const result = await this.socket.sendMessage(jid, { text: message });
    console.log(`📤 Mensaje enviado a ${phoneNumber}`);
    return result;
  }

  async sendImage(phoneNumber, imagePath, caption = '') {
    if (!this.isConnected) throw new Error('No conectado a WhatsApp');

    const jid = this.formatJid(phoneNumber);
    const image = fs.readFileSync(imagePath);

    const result = await this.socket.sendMessage(jid, {
      image: image,
      caption: caption
    });
    console.log(`🖼️ Imagen enviada a ${phoneNumber}`);
    return result;
  }

  async sendVideo(phoneNumber, videoPath, caption = '') {
    if (!this.isConnected) throw new Error('No conectado a WhatsApp');

    const jid = this.formatJid(phoneNumber);
    const video = fs.readFileSync(videoPath);

    const result = await this.socket.sendMessage(jid, {
      video: video,
      caption: caption
    });
    console.log(`🎥 Video enviado a ${phoneNumber}`);
    return result;
  }

  async sendBulkMessages(phoneNumbers, message, delayMs = 3000) {
    const results = [];
    for (const phone of phoneNumbers) {
      try {
        const result = await this.sendMessage(phone, message);
        results.push({ phone, success: true, result });
      } catch (error) {
        results.push({ phone, success: false, error: error.message });
      }
      // Delay entre mensajes para evitar ban
      await this.delay(delayMs);
    }
    return results;
  }

  // ==================== ESTADOS ====================

  async postTextStatus(text) {
    if (!this.isConnected) throw new Error('No conectado a WhatsApp');

    const result = await this.socket.sendMessage('status@broadcast', {
      text: text
    });
    console.log('📝 Estado de texto publicado');
    return result;
  }

  async postImageStatus(imagePath, caption = '') {
    if (!this.isConnected) throw new Error('No conectado a WhatsApp');

    const image = fs.readFileSync(imagePath);

    const result = await this.socket.sendMessage('status@broadcast', {
      image: image,
      caption: caption
    });
    console.log('🖼️ Estado de imagen publicado');
    return result;
  }

  async postVideoStatus(videoPath, caption = '') {
    if (!this.isConnected) throw new Error('No conectado a WhatsApp');

    const video = fs.readFileSync(videoPath);

    const result = await this.socket.sendMessage('status@broadcast', {
      video: video,
      caption: caption
    });
    console.log('🎥 Estado de video publicado');
    return result;
  }

  // ==================== GRUPOS ====================

  async joinGroup(inviteLink) {
    if (!this.isConnected) throw new Error('No conectado a WhatsApp');

    // Extraer código del link
    const code = inviteLink.replace('https://chat.whatsapp.com/', '');

    const result = await this.socket.groupAcceptInvite(code);
    console.log('👥 Unido al grupo:', result);
    return result;
  }

  async getGroups() {
    if (!this.isConnected) throw new Error('No conectado a WhatsApp');

    const groups = await this.socket.groupFetchAllParticipating();
    return Object.values(groups);
  }

  async leaveGroup(groupId) {
    if (!this.isConnected) throw new Error('No conectado a WhatsApp');

    await this.socket.groupLeave(groupId);
    console.log('👋 Salió del grupo:', groupId);
  }

  async sendGroupMessage(groupId, message) {
    if (!this.isConnected) throw new Error('No conectado a WhatsApp');

    const result = await this.socket.sendMessage(groupId, { text: message });
    console.log('📤 Mensaje enviado al grupo');
    return result;
  }

  // ==================== REACCIONES ====================

  async reactToMessage(messageKey, emoji) {
    if (!this.isConnected) throw new Error('No conectado a WhatsApp');

    const result = await this.socket.sendMessage(messageKey.remoteJid, {
      react: {
        text: emoji,
        key: messageKey
      }
    });
    console.log(`${emoji} Reacción enviada`);
    return result;
  }

  async removeReaction(messageKey) {
    return this.reactToMessage(messageKey, '');
  }

  // ==================== UTILIDADES ====================

  formatJid(phoneNumber) {
    let cleaned = phoneNumber.replace(/\D/g, '');
    if (!cleaned.endsWith('@s.whatsapp.net')) {
      cleaned = `${cleaned}@s.whatsapp.net`;
    }
    return cleaned;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      phoneNumber: this.phoneNumber,
      hasQR: !!this.qrCode
    };
  }
}

module.exports = WhatsAppClient;
