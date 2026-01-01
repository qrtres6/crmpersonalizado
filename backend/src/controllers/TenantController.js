const { Tenant, User, WhatsAppConnection, Contact, Ticket, Department } = require('../models');
const { Op } = require('sequelize');

class TenantController {
  async index(req, res) {
    try {
      const { page = 1, limit = 20, status, search } = req.query;
      const offset = (page - 1) * limit;

      const where = {};
      if (status) where.status = status;
      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { slug: { [Op.like]: `%${search}%` } }
        ];
      }

      const { count, rows } = await Tenant.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [['createdAt', 'DESC']]
      });

      const tenantsWithStats = await Promise.all(rows.map(async (tenant) => {
        const [usersCount, connectionsCount, contactsCount, ticketsCount] = await Promise.all([
          User.count({ where: { tenantId: tenant.id } }),
          WhatsAppConnection.count({ where: { tenantId: tenant.id } }),
          Contact.count({ where: { tenantId: tenant.id } }),
          Ticket.count({ where: { tenantId: tenant.id } })
        ]);
        return { ...tenant.toJSON(), stats: { users: usersCount, connections: connectionsCount, contacts: contactsCount, tickets: ticketsCount } };
      }));

      return res.json({
        success: true,
        data: {
          tenants: tenantsWithStats,
          pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) }
        }
      });
    } catch (error) {
      console.error('Error listando tenants:', error);
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async show(req, res) {
    try {
      const { id } = req.params;
      const tenant = await Tenant.findByPk(id);
      if (!tenant) {
        return res.status(404).json({ success: false, message: 'Tenant no encontrado' });
      }

      const [usersCount, connectionsCount, contactsCount, ticketsOpen, ticketsClosed] = await Promise.all([
        User.count({ where: { tenantId: tenant.id } }),
        WhatsAppConnection.count({ where: { tenantId: tenant.id } }),
        Contact.count({ where: { tenantId: tenant.id } }),
        Ticket.count({ where: { tenantId: tenant.id, status: ['pending', 'open'] } }),
        Ticket.count({ where: { tenantId: tenant.id, status: ['closed', 'resolved'] } })
      ]);

      return res.json({
        success: true,
        data: { ...tenant.toJSON(), stats: { users: usersCount, connections: connectionsCount, contacts: contactsCount, ticketsOpen, ticketsClosed } }
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async store(req, res) {
    try {
      const { name, slug, logo, primaryColor, secondaryColor, settings, plan, maxUsers, maxConnections, adminEmail, adminPassword, adminName } = req.body;

      if (!name || !slug) {
        return res.status(400).json({ success: false, message: 'Nombre y slug requeridos' });
      }

      const existing = await Tenant.findOne({ where: { slug } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'El slug ya está en uso' });
      }

      const tenant = await Tenant.create({
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        logo,
        primaryColor: primaryColor || '#6366f1',
        secondaryColor: secondaryColor || '#4f46e5',
        settings: settings || {},
        plan: plan || 'pro',
        maxUsers: maxUsers || 50,
        maxConnections: maxConnections || 5
      });

      await Department.create({
        tenantId: tenant.id,
        name: 'General',
        description: 'Departamento general',
        isDefault: true
      });

      let adminUser = null;
      if (adminEmail && adminPassword) {
        adminUser = await User.create({
          tenantId: tenant.id,
          name: adminName || 'Administrador',
          email: adminEmail.toLowerCase(),
          password: adminPassword,
          role: 'admin',
          permissions: {
            tickets: { view: true, create: true, edit: true, delete: true, transfer: true },
            contacts: { view: true, create: true, edit: true, delete: true, import: true },
            campaigns: { view: true, create: true, edit: true, delete: true },
            reports: { view: true, export: true },
            settings: { view: true, edit: true },
            users: { view: true, create: true, edit: true, delete: true },
            connections: { view: true, create: true, edit: true, delete: true }
          }
        });
      }

      return res.status(201).json({ success: true, data: { tenant, adminUser: adminUser ? adminUser.toSafeObject() : null } });
    } catch (error) {
      console.error('Error creando tenant:', error);
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, logo, primaryColor, secondaryColor, settings, status, plan, maxUsers, maxConnections, expiresAt } = req.body;

      const tenant = await Tenant.findByPk(id);
      if (!tenant) {
        return res.status(404).json({ success: false, message: 'Tenant no encontrado' });
      }

      const updateData = {};
      if (name) updateData.name = name;
      if (logo !== undefined) updateData.logo = logo;
      if (primaryColor) updateData.primaryColor = primaryColor;
      if (secondaryColor) updateData.secondaryColor = secondaryColor;
      if (settings) updateData.settings = { ...tenant.settings, ...settings };
      if (status) updateData.status = status;
      if (plan) updateData.plan = plan;
      if (maxUsers) updateData.maxUsers = maxUsers;
      if (maxConnections) updateData.maxConnections = maxConnections;
      if (expiresAt !== undefined) updateData.expiresAt = expiresAt;

      await tenant.update(updateData);
      return res.json({ success: true, data: tenant });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async destroy(req, res) {
    try {
      const { id } = req.params;
      const tenant = await Tenant.findByPk(id);
      if (!tenant) {
        return res.status(404).json({ success: false, message: 'Tenant no encontrado' });
      }
      await tenant.update({ status: 'inactive' });
      return res.json({ success: true, message: 'Tenant desactivado' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async getUsers(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const users = await User.findAndCountAll({
        where: { tenantId: id },
        limit: parseInt(limit),
        offset: (page - 1) * limit,
        order: [['createdAt', 'DESC']],
        attributes: { exclude: ['password', 'tokenVersion'] }
      });

      return res.json({
        success: true,
        data: { users: users.rows, pagination: { total: users.count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(users.count / limit) } }
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }
}

module.exports = new TenantController();
