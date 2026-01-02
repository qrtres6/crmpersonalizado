const { WhatsAppConnection } = require('../models');
const WhatsAppService = require('../services/WhatsAppService');
const MetaAPIService = require('../services/MetaAPIService');

class ConnectionController {
  async index(req, res) {
    try {
      const tenantId = req.tenantId || req.user.tenantId;
      const where = tenantId ? { tenantId } : {};
      
      const { count, rows } = await WhatsAppConnection.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        attributes: { exclude: ['sessionData', 'metaAccessToken'] }
      });

      return res.json({ success: true, data: { connections: rows, pagination: { total: count } } });
    } catch (error) {
      console.error('Error listando conexiones:', error);
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async store(req, res) {
    try {
      const { name, type } = req.body;
      const tenantId = req.tenantId || req.user.tenantId;

      if (!name || !type) return res.status(400).json({ success: false, message: 'Nombre y tipo requeridos' });
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant no identificado' });

      const connection = await WhatsAppConnection.create({ tenantId, name, type, status: 'disconnected' });
      return res.status(201).json({ success: true, data: connection });
    } catch (error) {
      console.error('Error creando conexión:', error);
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId || req.user.tenantId;
      const { metaPhoneId, metaBusinessId, metaAccessToken, metaWebhookToken, name } = req.body;
      
      const connection = await WhatsAppConnection.findOne({ where: { id, ...(tenantId ? { tenantId } : {}) } });
      if (!connection) return res.status(404).json({ success: false, message: 'Conexión no encontrada' });

      const updateData = {};
      if (name) updateData.name = name;
      if (metaPhoneId) updateData.metaPhoneId = metaPhoneId;
      if (metaBusinessId) updateData.metaBusinessId = metaBusinessId;
      if (metaAccessToken) updateData.metaAccessToken = metaAccessToken;
      if (metaWebhookToken !== undefined) updateData.metaWebhookToken = metaWebhookToken;

      await connection.update(updateData);
      return res.json({ success: true, data: connection });
    } catch (error) {
      console.error('Error actualizando conexión:', error);
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async connect(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId || req.user.tenantId;
      
      const connection = await WhatsAppConnection.findOne({ where: { id, ...(tenantId ? { tenantId } : {}) } });
      if (!connection) return res.status(404).json({ success: false, message: 'Conexión no encontrada' });

      await WhatsAppService.initializeConnection(id);
      return res.json({ success: true, message: connection.type === 'baileys' ? 'Esperando QR' : 'Conectado', data: { status: 'connecting' } });
    } catch (error) {
      console.error('Error conectando:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async disconnect(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId || req.user.tenantId;
      
      const connection = await WhatsAppConnection.findOne({ where: { id, ...(tenantId ? { tenantId } : {}) } });
      if (!connection) return res.status(404).json({ success: false, message: 'Conexión no encontrada' });

      await WhatsAppService.disconnectConnection(id);
      return res.json({ success: true, message: 'Desconectado' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async destroy(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId || req.user.tenantId;
      
      const connection = await WhatsAppConnection.findOne({ where: { id, ...(tenantId ? { tenantId } : {}) } });
      if (!connection) return res.status(404).json({ success: false, message: 'Conexión no encontrada' });

      if (connection.status === 'connected') await WhatsAppService.disconnectConnection(id);
      await connection.destroy();
      return res.json({ success: true, message: 'Conexión eliminada' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async status(req, res) {
    try {
      const { id } = req.params;
      const connection = await WhatsAppConnection.findByPk(id, { attributes: ['id', 'status', 'phoneNumber', 'lastConnected', 'lastError'] });
      if (!connection) return res.status(404).json({ success: false, message: 'Conexión no encontrada' });
      return res.json({ success: true, data: connection });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  // Webhook Meta API
  async metaWebhookGet(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Buscar conexión con ese token o aceptar cualquiera para verificación inicial
    const connection = await WhatsAppConnection.findOne({ where: { metaWebhookToken: token } });
    
    if (mode === 'subscribe' && (connection || token)) {
      console.log('Webhook Meta verificado');
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }

  async metaWebhookPost(req, res) {
    try {
      const data = req.body;
      
      if (data.object === 'whatsapp_business_account') {
        for (const entry of data.entry || []) {
          for (const change of entry.changes || []) {
            if (change.field === 'messages') {
              const value = change.value;
              const phoneNumberId = value.metadata?.phone_number_id;
              
              // Buscar conexión por phoneNumberId
              const connection = await WhatsAppConnection.findOne({ where: { metaPhoneId: phoneNumberId } });
              if (connection) {
                await MetaAPIService.processWebhook(connection.id, value);
              }
            }
          }
        }
      }

      return res.sendStatus(200);
    } catch (error) {
      console.error('Error webhook Meta:', error);
      return res.sendStatus(200);
    }
  }
}

module.exports = new ConnectionController();
