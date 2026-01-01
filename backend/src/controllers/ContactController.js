const { Contact, Ticket } = require('../models');
const { withTenant } = require('../middlewares/tenant');
const { Op } = require('sequelize');

class ContactController {
  async index(req, res) {
    try {
      const { page = 1, limit = 50, search, status } = req.query;
      const offset = (page - 1) * limit;

      const where = withTenant(req);
      if (status) where.status = status;
      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { phoneNumber: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ];
      }

      const { count, rows } = await Contact.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [['lastContactAt', 'DESC']]
      });

      return res.json({
        success: true,
        data: {
          contacts: rows,
          pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) }
        }
      });
    } catch (error) {
      console.error('Error listando contactos:', error);
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async show(req, res) {
    try {
      const { id } = req.params;
      const contact = await Contact.findOne({
        where: { id, ...withTenant(req) }
      });

      if (!contact) {
        return res.status(404).json({ success: false, message: 'Contacto no encontrado' });
      }

      return res.json({ success: true, data: contact });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async store(req, res) {
    try {
      const { name, phoneNumber, email, notes } = req.body;

      if (!name || !phoneNumber) {
        return res.status(400).json({ success: false, message: 'Nombre y teléfono requeridos' });
      }

      // Verificar si ya existe
      const existing = await Contact.findOne({
        where: { tenantId: req.tenantId, phoneNumber }
      });

      if (existing) {
        return res.status(400).json({ success: false, message: 'Ya existe un contacto con ese teléfono' });
      }

      const contact = await Contact.create({
        tenantId: req.tenantId,
        name,
        phoneNumber,
        email,
        notes,
        source: 'manual'
      });

      return res.status(201).json({ success: true, data: contact });
    } catch (error) {
      console.error('Error creando contacto:', error);
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, email, notes, status } = req.body;

      const contact = await Contact.findOne({
        where: { id, ...withTenant(req) }
      });

      if (!contact) {
        return res.status(404).json({ success: false, message: 'Contacto no encontrado' });
      }

      const updateData = {};
      if (name) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (notes !== undefined) updateData.notes = notes;
      if (status) updateData.status = status;

      await contact.update(updateData);

      return res.json({ success: true, data: contact });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async destroy(req, res) {
    try {
      const { id } = req.params;

      const contact = await Contact.findOne({
        where: { id, ...withTenant(req) }
      });

      if (!contact) {
        return res.status(404).json({ success: false, message: 'Contacto no encontrado' });
      }

      // Verificar si tiene tickets
      const ticketCount = await Ticket.count({ where: { contactId: id } });
      if (ticketCount > 0) {
        return res.status(400).json({ success: false, message: 'No se puede eliminar, tiene tickets asociados' });
      }

      await contact.destroy();
      return res.json({ success: true, message: 'Contacto eliminado' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async block(req, res) {
    try {
      const { id } = req.params;

      const contact = await Contact.findOne({
        where: { id, ...withTenant(req) }
      });

      if (!contact) {
        return res.status(404).json({ success: false, message: 'Contacto no encontrado' });
      }

      await contact.update({ status: 'blocked' });
      return res.json({ success: true, message: 'Contacto bloqueado' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }
}

module.exports = new ContactController();
