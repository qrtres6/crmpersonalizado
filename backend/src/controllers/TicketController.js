const { Ticket, Contact, Message, User, Department, Tag, WhatsAppConnection } = require('../models');
const { withTenant } = require('../middlewares/tenant');
const { Op } = require('sequelize');
const WhatsAppService = require('../services/WhatsAppService');

class TicketController {
  async index(req, res) {
    try {
      const { page = 1, limit = 20, status, assignedUserId, departmentId, search } = req.query;
      const offset = (page - 1) * limit;

      const where = withTenant(req);
      if (status) {
        where.status = Array.isArray(status) ? status : status.split(',');
      }
      if (assignedUserId) where.assignedUserId = assignedUserId;
      if (departmentId) where.departmentId = departmentId;

      const include = [
        { model: Contact, as: 'contact', attributes: ['id', 'name', 'phoneNumber', 'avatar'] },
        { model: User, as: 'assignedUser', attributes: ['id', 'name', 'avatar'] },
        { model: Department, as: 'department', attributes: ['id', 'name', 'color'] },
        { model: WhatsAppConnection, as: 'connection', attributes: ['id', 'name', 'type', 'status'] }
      ];

      if (search) {
        include[0].where = {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { phoneNumber: { [Op.like]: `%${search}%` } }
          ]
        };
      }

      const { count, rows } = await Ticket.findAndCountAll({
        where,
        include,
        limit: parseInt(limit),
        offset,
        order: [['lastMessageAt', 'DESC']],
        distinct: true
      });

      return res.json({
        success: true,
        data: {
          tickets: rows,
          pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) }
        }
      });
    } catch (error) {
      console.error('Error listando tickets:', error);
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async show(req, res) {
    try {
      const { id } = req.params;
      const ticket = await Ticket.findOne({
        where: { id, ...withTenant(req) },
        include: [
          { model: Contact, as: 'contact' },
          { model: User, as: 'assignedUser', attributes: { exclude: ['password', 'tokenVersion'] } },
          { model: Department, as: 'department' },
          { model: WhatsAppConnection, as: 'connection', attributes: { exclude: ['sessionData', 'metaAccessToken'] } },
          { model: Tag, as: 'tags' }
        ]
      });

      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
      }

      return res.json({ success: true, data: ticket });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { status, priority, assignedUserId, departmentId, internalNotes, tagIds } = req.body;

      const ticket = await Ticket.findOne({
        where: { id, ...withTenant(req) }
      });

      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
      }

      const updateData = {};
      if (status) {
        updateData.status = status;
        if (['closed', 'resolved'].includes(status) && !ticket.closedAt) {
          updateData.closedAt = new Date();
          updateData.closedByUserId = req.user.id;
        }
      }
      if (priority) updateData.priority = priority;
      if (assignedUserId !== undefined) {
        updateData.assignedUserId = assignedUserId;
        if (assignedUserId && ticket.status === 'pending') {
          updateData.status = 'open';
        }
      }
      if (departmentId !== undefined) updateData.departmentId = departmentId;
      if (internalNotes !== undefined) updateData.internalNotes = internalNotes;

      await ticket.update(updateData);

      if (tagIds !== undefined) {
        const tags = await Tag.findAll({ where: { id: tagIds, tenantId: req.tenantId } });
        await ticket.setTags(tags);
      }

      // Actualizar contador de tickets del usuario si se asignó
      if (assignedUserId && assignedUserId !== ticket.assignedUserId) {
        if (ticket.assignedUserId) {
          await User.decrement('currentTickets', { where: { id: ticket.assignedUserId } });
        }
        await User.increment('currentTickets', { where: { id: assignedUserId } });
      }

      const updatedTicket = await Ticket.findByPk(id, {
        include: [
          { model: Contact, as: 'contact' },
          { model: User, as: 'assignedUser', attributes: { exclude: ['password', 'tokenVersion'] } },
          { model: Department, as: 'department' },
          { model: Tag, as: 'tags' }
        ]
      });

      // Notificar actualización
      const io = req.app.get('io');
      if (io) {
        io.to(`tenant:${req.tenantId}`).emit('ticket:updated', updatedTicket);
      }

      return res.json({ success: true, data: updatedTicket });
    } catch (error) {
      console.error('Error actualizando ticket:', error);
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async close(req, res) {
    try {
      const { id } = req.params;
      const { closeReason } = req.body;

      const ticket = await Ticket.findOne({
        where: { id, ...withTenant(req) }
      });

      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
      }

      await ticket.update({
        status: 'closed',
        closedAt: new Date(),
        closedByUserId: req.user.id,
        closeReason
      });

      // Decrementar contador del usuario
      if (ticket.assignedUserId) {
        await User.decrement('currentTickets', { where: { id: ticket.assignedUserId } });
        await User.increment('totalTicketsHandled', { where: { id: ticket.assignedUserId } });
      }

      const io = req.app.get('io');
      if (io) {
        io.to(`tenant:${req.tenantId}`).emit('ticket:closed', { ticketId: id });
      }

      return res.json({ success: true, message: 'Ticket cerrado' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async transfer(req, res) {
    try {
      const { id } = req.params;
      const { userId, departmentId } = req.body;

      const ticket = await Ticket.findOne({
        where: { id, ...withTenant(req) }
      });

      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
      }

      const oldAssignedUserId = ticket.assignedUserId;

      const updateData = {
        transferCount: ticket.transferCount + 1
      };

      if (userId !== undefined) updateData.assignedUserId = userId;
      if (departmentId !== undefined) updateData.departmentId = departmentId;

      await ticket.update(updateData);

      // Actualizar contadores
      if (oldAssignedUserId) {
        await User.decrement('currentTickets', { where: { id: oldAssignedUserId } });
      }
      if (userId) {
        await User.increment('currentTickets', { where: { id: userId } });
      }

      const io = req.app.get('io');
      if (io) {
        io.to(`tenant:${req.tenantId}`).emit('ticket:transferred', { ticketId: id, userId, departmentId });
      }

      return res.json({ success: true, message: 'Ticket transferido' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async messages(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;

      const ticket = await Ticket.findOne({
        where: { id, ...withTenant(req) }
      });

      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
      }

      const { count, rows } = await Message.findAndCountAll({
        where: { ticketId: id },
        include: [
          { model: User, as: 'user', attributes: ['id', 'name', 'avatar'] },
          { model: Message, as: 'quotedMessage', attributes: ['id', 'body', 'messageType'] }
        ],
        limit: parseInt(limit),
        offset,
        order: [['createdAt', 'ASC']]
      });

      // Marcar como leídos
      await ticket.update({ unreadMessages: 0 });

      return res.json({
        success: true,
        data: {
          messages: rows,
          pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) }
        }
      });
    } catch (error) {
      console.error('Error obteniendo mensajes:', error);
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async sendMessage(req, res) {
    try {
      const { id } = req.params;
      const { body, type = 'text', mediaUrl, quotedMessageId } = req.body;

      const ticket = await Ticket.findOne({
        where: { id, ...withTenant(req) },
        include: [{ model: WhatsAppConnection, as: 'connection' }]
      });

      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
      }

      if (!ticket.connection || ticket.connection.status !== 'connected') {
        return res.status(400).json({ success: false, message: 'Conexión WhatsApp no disponible' });
      }

      let content;
      if (type === 'text') {
        content = body;
      } else {
        content = { type, url: mediaUrl, text: body, caption: body };
      }

      const { result, message } = await WhatsAppService.sendMessage(
        ticket.connectionId,
        ticket.whatsappChatId,
        content,
        req.user.id,
        ticket.id
      );

      return res.json({ success: true, data: { message, whatsappId: result.id } });
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      return res.status(500).json({ success: false, message: error.message || 'Error enviando mensaje' });
    }
  }
}

module.exports = new TicketController();
