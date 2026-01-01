const { User, Department, Ticket } = require('../models');
const { Op } = require('sequelize');
const { withTenant } = require('../middlewares/tenant');

class UserController {
  async index(req, res) {
    try {
      const { page = 1, limit = 20, status, role, search } = req.query;
      const offset = (page - 1) * limit;

      const where = withTenant(req);
      if (status) where.status = status;
      if (role) where.role = role;
      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ];
      }

      const { count, rows } = await User.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [['createdAt', 'DESC']],
        attributes: { exclude: ['password', 'tokenVersion'] },
        include: [{ model: Department, as: 'departments', attributes: ['id', 'name', 'color'] }]
      });

      return res.json({
        success: true,
        data: { users: rows, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) } }
      });
    } catch (error) {
      console.error('Error listando usuarios:', error);
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async show(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findOne({
        where: { id, ...withTenant(req) },
        attributes: { exclude: ['password', 'tokenVersion'] },
        include: [{ model: Department, as: 'departments', attributes: ['id', 'name', 'color'] }]
      });

      if (!user) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }

      const [openTickets, closedTickets] = await Promise.all([
        Ticket.count({ where: { assignedUserId: user.id, status: ['pending', 'open'] } }),
        Ticket.count({ where: { assignedUserId: user.id, status: ['closed', 'resolved'] } })
      ]);

      return res.json({
        success: true,
        data: { ...user.toJSON(), stats: { openTickets, closedTickets, totalHandled: user.totalTicketsHandled } }
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async store(req, res) {
    try {
      const { name, email, password, role, permissions, status, maxTickets, departmentIds } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: 'Nombre, email y contraseña requeridos' });
      }

      const existing = await User.findOne({ where: { email: email.toLowerCase(), tenantId: req.tenantId } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'El email ya está registrado' });
      }

      if (req.tenant) {
        const usersCount = await User.count({ where: { tenantId: req.tenantId } });
        if (usersCount >= req.tenant.maxUsers) {
          return res.status(400).json({ success: false, message: 'Límite de usuarios alcanzado' });
        }
      }

      if (['super_admin'].includes(role) && req.user.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Sin permisos para crear este usuario' });
      }

      const user = await User.create({
        tenantId: req.tenantId,
        name,
        email: email.toLowerCase(),
        password,
        role: role || 'agent',
        permissions: permissions || undefined,
        status: status || 'active',
        maxTickets: maxTickets || 10
      });

      if (departmentIds && departmentIds.length > 0) {
        const departments = await Department.findAll({ where: { id: departmentIds, tenantId: req.tenantId } });
        await user.setDepartments(departments);
      }

      const createdUser = await User.findByPk(user.id, {
        attributes: { exclude: ['password', 'tokenVersion'] },
        include: [{ model: Department, as: 'departments', attributes: ['id', 'name', 'color'] }]
      });

      return res.status(201).json({ success: true, data: createdUser });
    } catch (error) {
      console.error('Error creando usuario:', error);
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, email, password, role, permissions, status, maxTickets, departmentIds } = req.body;

      const user = await User.findOne({ where: { id, ...withTenant(req) } });
      if (!user) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }

      if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Sin permisos' });
      }

      const updateData = {};
      if (name) updateData.name = name;
      if (email) {
        const existing = await User.findOne({ where: { email: email.toLowerCase(), tenantId: req.tenantId, id: { [Op.ne]: id } } });
        if (existing) {
          return res.status(400).json({ success: false, message: 'Email en uso' });
        }
        updateData.email = email.toLowerCase();
      }
      if (password) updateData.password = password;
      if (role && req.user.role === 'admin') updateData.role = role;
      if (permissions) updateData.permissions = permissions;
      if (status) updateData.status = status;
      if (maxTickets) updateData.maxTickets = maxTickets;

      await user.update(updateData);

      if (departmentIds !== undefined) {
        const departments = await Department.findAll({ where: { id: departmentIds, tenantId: req.tenantId } });
        await user.setDepartments(departments);
      }

      const updatedUser = await User.findByPk(id, {
        attributes: { exclude: ['password', 'tokenVersion'] },
        include: [{ model: Department, as: 'departments', attributes: ['id', 'name', 'color'] }]
      });

      return res.json({ success: true, data: updatedUser });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async destroy(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findOne({ where: { id, ...withTenant(req) } });

      if (!user) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }

      if (user.id === req.user.id) {
        return res.status(400).json({ success: false, message: 'No puedes eliminarte' });
      }

      if (user.role === 'super_admin') {
        return res.status(403).json({ success: false, message: 'No se puede eliminar super admin' });
      }

      await user.update({ status: 'inactive' });
      return res.json({ success: true, message: 'Usuario desactivado' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async online(req, res) {
    try {
      const users = await User.findAll({
        where: { ...withTenant(req), isOnline: true, status: 'active' },
        attributes: ['id', 'uuid', 'name', 'avatar', 'role', 'status', 'currentTickets', 'maxTickets']
      });
      return res.json({ success: true, data: users });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }
}

module.exports = new UserController();
