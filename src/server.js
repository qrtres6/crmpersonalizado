const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

class WebServer {
  constructor(whatsappClient, automationService) {
    this.wa = whatsappClient;
    this.automation = automationService;
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: { origin: '*' }
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocket();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '..', 'public')));

    // Configurar multer para subida de archivos
    const storage = multer.diskStorage({
      destination: path.join(__dirname, '..', 'media'),
      filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
      }
    });
    this.upload = multer({ storage });
  }

  setupRoutes() {
    const app = this.app;

    // ==================== STATUS ====================

    app.get('/api/status', (req, res) => {
      res.json({
        whatsapp: this.wa.getStatus(),
        automation: this.automation.getStats()
      });
    });

    // ==================== CONEXIÓN ====================

    app.post('/api/connect', async (req, res) => {
      try {
        await this.wa.connect();
        res.json({ success: true, message: 'Conectando...' });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    app.post('/api/disconnect', async (req, res) => {
      try {
        await this.wa.disconnect();
        res.json({ success: true, message: 'Desconectado' });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // ==================== MENSAJES ====================

    app.post('/api/send-message', async (req, res) => {
      try {
        const { phoneNumber, message } = req.body;
        const result = await this.wa.sendMessage(phoneNumber, message);
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    app.post('/api/send-bulk', async (req, res) => {
      try {
        const { phoneNumbers, message, delaySeconds } = req.body;
        const results = await this.automation.sendBulkMessages(
          phoneNumbers,
          message,
          delaySeconds || 5
        );
        res.json({ success: true, results });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    app.post('/api/send-image', this.upload.single('image'), async (req, res) => {
      try {
        const { phoneNumber, caption } = req.body;
        const imagePath = req.file.path;
        const result = await this.wa.sendImage(phoneNumber, imagePath, caption);
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // ==================== ESTADOS ====================

    app.post('/api/status/text', async (req, res) => {
      try {
        const { text } = req.body;
        const result = await this.wa.postTextStatus(text);
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    app.post('/api/status/image', this.upload.single('image'), async (req, res) => {
      try {
        const { caption } = req.body;
        const imagePath = req.file.path;
        const result = await this.wa.postImageStatus(imagePath, caption);
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    app.post('/api/status/video', this.upload.single('video'), async (req, res) => {
      try {
        const { caption } = req.body;
        const videoPath = req.file.path;
        const result = await this.wa.postVideoStatus(videoPath, caption);
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    app.post('/api/status/schedule', async (req, res) => {
      try {
        const { id, type, content, mediaPath, caption, cronExpression } = req.body;
        const result = this.automation.scheduleStatus({
          id: id || `status_${Date.now()}`,
          type,
          content,
          mediaPath,
          caption,
          cronExpression
        });
        res.json(result);
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // ==================== GRUPOS ====================

    app.get('/api/groups', async (req, res) => {
      try {
        const groups = await this.wa.getGroups();
        res.json({ success: true, groups });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    app.post('/api/groups/join', async (req, res) => {
      try {
        const { inviteLink } = req.body;
        const result = await this.wa.joinGroup(inviteLink);
        res.json({ success: true, groupId: result });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    app.post('/api/groups/join-bulk', async (req, res) => {
      try {
        const { inviteLinks } = req.body;
        const results = await this.automation.joinGroups(inviteLinks);
        res.json({ success: true, results });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    app.post('/api/groups/leave', async (req, res) => {
      try {
        const { groupId } = req.body;
        await this.wa.leaveGroup(groupId);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    app.post('/api/groups/send-all', async (req, res) => {
      try {
        const { message } = req.body;
        const results = await this.automation.sendToAllGroups(message);
        res.json({ success: true, results });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // ==================== REACCIONES ====================

    app.post('/api/react', async (req, res) => {
      try {
        const { messageKey, emoji } = req.body;
        const result = await this.wa.reactToMessage(messageKey, emoji);
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    app.post('/api/auto-react/enable', (req, res) => {
      const { emojis } = req.body;
      const result = this.automation.enableAutoReact(emojis || ['👍']);
      res.json(result);
    });

    app.post('/api/auto-react/disable', (req, res) => {
      const result = this.automation.disableAutoReact();
      res.json(result);
    });

    // ==================== JOBS ====================

    app.get('/api/jobs', (req, res) => {
      const jobs = this.automation.listJobs();
      res.json({ success: true, jobs });
    });

    app.delete('/api/jobs/:id', (req, res) => {
      const result = this.automation.stopJob(req.params.id);
      res.json(result);
    });

    app.delete('/api/jobs', (req, res) => {
      const result = this.automation.stopAllJobs();
      res.json(result);
    });

    // ==================== PROGRAMAR MENSAJES ====================

    app.post('/api/messages/schedule', async (req, res) => {
      try {
        const { id, phoneNumbers, message, cronExpression, delaySeconds } = req.body;
        const result = this.automation.scheduleMessage({
          id: id || `msg_${Date.now()}`,
          phoneNumbers,
          message,
          cronExpression,
          delaySeconds
        });
        res.json(result);
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
  }

  setupSocket() {
    this.io.on('connection', (socket) => {
      console.log('🔌 Cliente conectado:', socket.id);

      socket.on('disconnect', () => {
        console.log('🔌 Cliente desconectado:', socket.id);
      });
    });

    // Reenviar eventos de WhatsApp al socket
    this.wa.on('qr', (qr) => {
      this.io.emit('qr', qr);
    });

    this.wa.on('connected', (data) => {
      this.io.emit('connected', data);
    });

    this.wa.on('disconnected', (data) => {
      this.io.emit('disconnected', data);
    });

    this.wa.on('message', (message) => {
      this.io.emit('message', {
        from: message.key.remoteJid,
        text: message.message?.conversation || message.message?.extendedTextMessage?.text,
        timestamp: message.messageTimestamp
      });
    });
  }

  start(port = 3000) {
    this.server.listen(port, () => {
      console.log(`\n🚀 Servidor web iniciado en http://localhost:${port}`);
      console.log(`📱 Abre el navegador para controlar WhatsApp\n`);
    });
  }
}

module.exports = WebServer;
