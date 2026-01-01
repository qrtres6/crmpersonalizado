const { WhatsAppConnection } = require('../models');
const WhatsAppService = require('../services/WhatsAppService');
const MetaAPIService = require('../services/MetaAPIService');
const { withTenant } = require('../middlewares/tenant');
const { Op } = require('sequelize');

class ConnectionController {
  async index(req, res) {
    try {
      const { page = 1, limit = 20, status, type } = req.query;
      const offset = (page - 1) * limit;

      const where = withTenant(req);
      if (status) where.status = status;
      if (type) where.type = type;

      const { count, rows } = await WhatsAppConnection.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [['createdAt', 'DESC']],
        attributes: { exclude: ['sessionData', 'metaAccessToken'] }
      });

      return res.json({
        success: true,
        data: {
          connections: rows,
          pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) }
        }
      });
    } catch (error) {
      console.error('Error listando conexiones:', error);
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async show(req, res) {
    try {
      const { id } = req.params;
      const connection = await WhatsAppConnection.findOne({
        where: { id, ...withTenant(req) },
        attributes: { exclude: ['sessionData', 'metaAccessToken'] }
      });

      if (!connection) {
        return res.status(404).json({ success: false, message: 'Conexión no encontrada' });
      }

      return res.json({ success: true, data: connection });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async store(req, res) {
    try {
      const { name, type, metaPhoneId, metaBusinessId, metaAccessToken, metaWebhookToken, settings, isDefault } = req.body;

      if (!name || !type) {
        return res.status(400).json({ success: false, message: 'Nombre y tipo requeridos' });
      }

      if (!['baileys', 'meta'].includes(type)) {
        return res.status(400).json({ success: false, message: 'Tipo inválido. Debe ser baileys o meta' });
      }

      // Verificar límite de conexiones
      if (req.tenant) {
        const connectionsCount = await WhatsAppConnection.count({ where: { tenantId: req.tenantId } });
        if (connectionsCount >= req.tenant.maxConnections) {
          return res.status(400).json({ success: false, message: 'Límite de conexiones alcanzado' });
        }
      }

      // Si es default, quitar default de otras
      if (isDefault) {
        await WhatsAppConnection.update(
          { isDefault: false },
          { where: { tenantId: req.tenantId } }
        );
      }

      const connection = await WhatsAppConnection.create({
        tenantId: req.tenantId,
        name,
        type,
        metaPhoneId,
        metaBusinessId,
        metaAccessToken,
        metaWebhookToken,
        settings: settings || {},
        isDefault: isDefault || false,
        status: 'disconnected'
      });

      // Si es Meta y tiene token, registrar
      if (type === 'meta' && metaAccessToken) {
        MetaAPIService.registerConnection(connection.id, {
          metaPhoneId,
          metaBusinessId,
          metaAccessToken,
          metaWebhookToken
        });
      }

      return res.status(201).json({ success: true, data: connection });
    } catch (error) {
      console.error('Error creando conexión:', error);
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, metaPhoneId, metaBusinessId, metaAccessToken, metaWebhookToken, settings, isDefault } = req.body;

      const connection = await WhatsAppConnection.findOne({
        where: { id, ...withTenant(req) }
      });

      if (!connection) {
        return res.status(404).json({ success: false, message: 'Conexión no encontrada' });
      }

      if (isDefault) {
        await WhatsAppConnection.update(
          { isDefault: false },
          { where: { tenantId: req.tenantId, id: { [Op.ne]: id } } }
        );
      }

      const updateData = {};
      if (name) updateData.name = name;
      if (metaPhoneId !== undefined) updateData.metaPhoneId = metaPhoneId;
      if (metaBusinessId !== undefined) updateData.metaBusinessId = metaBusinessId;
      if (metaAccessToken !== undefined) updateData.metaAccessToken = metaAccessToken;
      if (metaWebhookToken !== undefined) updateData.metaWebhookToken = metaWebhookToken;
      if (settings) updateData.settings = { ...connection.settings, ...settings };
      if (isDefault !== undefined) updateData.isDefault = isDefault;

      await connection.update(updateData);

      // Actualizar registro en MetaAPI si aplica
      if (connection.type === 'meta' && metaAccessToken) {
        MetaAPIService.registerConnection(connection.id, {
          metaPhoneId: connection.metaPhoneId,
          metaBusinessId: connection.metaBusinessId,
          metaAccessToken: connection.metaAccessToken,
          metaWebhookToken: connection.metaWebhookToken
        });
      }

      return res.json({ success: true, data: connection });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async destroy(req, res) {
    try {
      const { id } = req.params;
      const connection = await WhatsAppConnection.findOne({
        where: { id, ...withTenant(req) }
      });

      if (!connection) {
        return res.status(404).json({ success: false, message: 'Conexión no encontrada' });
      }

      // Desconectar si está activa
      if (connection.status === 'connected' && connection.type === 'baileys') {
        await WhatsAppService.disconnectConnection(id);
      }

      await connection.destroy();
      return res.json({ success: true, message: 'Conexión eliminada' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async connect(req, res) {
    try {
      const { id } = req.params;
      const connection = await WhatsAppConnection.findOne({
        where: { id, ...withTenant(req) }
      });

      if (!connection) {
        return res.status(404).json({ success: false, message: 'Conexión no encontrada' });
      }

      await WhatsAppService.initializeConnection(id);

      return res.json({ 
        success: true, 
        message: connection.type === 'baileys' ? 'Esperando código QR' : 'Conexión iniciada',
        data: { status: 'connecting' }
      });
    } catch (error) {
      console.error('Error conectando:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async disconnect(req, res) {
    try {
      const { id } = req.params;
      const connection = await WhatsAppConnection.findOne({
        where: { id, ...withTenant(req) }
      });

      if (!connection) {
        return res.status(404).json({ success: false, message: 'Conexión no encontrada' });
      }

      await WhatsAppService.disconnectConnection(id);

      return res.json({ success: true, message: 'Desconectado' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async status(req, res) {
    try {
      const { id } = req.params;
      const connection = await WhatsAppConnection.findOne({
        where: { id, ...withTenant(req) },
        attributes: ['id', 'status', 'phoneNumber', 'lastConnected', 'lastError']
      });

      if (!connection) {
        return res.status(404).json({ success: false, message: 'Conexión no encontrada' });
      }

      return res.json({ success: true, data: connection });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  // Webhook para Meta API
  async metaWebhook(req, res) {
    try {
      // Verificación del webhook
      if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        // Buscar conexión con este token
        const connection = await WhatsAppConnection.findOne({
          where: { metaWebhookToken: token, type: 'meta' }
        });

        if (connection && mode === 'subscribe') {
          return res.status(200).send(challenge);
        }
        return res.sendStatus(403);
      }

      // Procesar mensajes entrantes
      if (req.method === 'POST') {
        const body = req.body;

        // Identificar la conexión
        const phoneNumberId = body.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
        if (!phoneNumberId) {
          return res.sendStatus(200);
        }

        const connection = await WhatsAppConnection.findOne({
          where: { metaPhoneId: phoneNumberId, type: 'meta' }
        });

        if (!connection) {
          return res.sendStatus(200);
        }

        const { messages, statuses } = MetaAPIService.processWebhook(body, connection.id, connection.tenantId);

        // Procesar mensajes
        for (const msg of messages) {
          await WhatsAppService.handleIncomingMessage({
            connectionId: msg.connectionId,
            tenantId: msg.tenantId,
            phoneNumber: msg.phoneNumber,
            message: { ...msg.message, contactName: msg.contactName }
          }, 'meta');
        }

        // Procesar estados
        for (const status of statuses) {
          const { Message } = require('../models');
          await Message.update(
            { status: status.status, statusAt: new Date(status.timestamp * 1000) },
            { where: { whatsappMessageId: status.messageId } }
          );
        }

        return res.sendStatus(200);
      }

      return res.sendStatus(400);
    } catch (error) {
      console.error('Error en webhook Meta:', error);
      return res.sendStatus(500);
    }
  }
}

module.exports = new ConnectionController();
