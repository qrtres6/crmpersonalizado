const jwt = require('jsonwebtoken');
const { User, Tenant } = require('../models');

class AuthController {
  async login(req, res) {
    try {
      const { email, password, tenantSlug } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email y contraseña requeridos' });
      }

      let whereClause = { email: email.toLowerCase() };
      let tenant = null;

      if (tenantSlug) {
        tenant = await Tenant.findOne({ where: { slug: tenantSlug } });
        if (!tenant) {
          return res.status(404).json({ success: false, message: 'Plataforma no encontrada' });
        }
        whereClause.tenantId = tenant.id;
      }

      const user = await User.findOne({
        where: whereClause,
        include: [{ model: Tenant, as: 'tenant', attributes: ['id', 'uuid', 'name', 'slug', 'status', 'logo', 'primaryColor', 'secondaryColor', 'settings'] }]
      });

      if (!user) {
        return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
      }

      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
      }

      if (user.status === 'inactive') {
        return res.status(401).json({ success: false, message: 'Usuario desactivado' });
      }

      if (user.role !== 'super_admin' && user.tenant && user.tenant.status !== 'active') {
        return res.status(401).json({ success: false, message: 'Plataforma suspendida' });
      }

      const token = jwt.sign(
        { userId: user.id, tenantId: user.tenantId, tokenVersion: user.tokenVersion },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      await user.update({ isOnline: true, lastSeen: new Date() });

      return res.json({ success: true, data: { token, user: user.toSafeObject() } });
    } catch (error) {
      console.error('Error en login:', error);
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async me(req, res) {
    try {
      const user = await User.findByPk(req.user.id, {
        include: [{ model: Tenant, as: 'tenant', attributes: ['id', 'uuid', 'name', 'slug', 'status', 'logo', 'primaryColor', 'secondaryColor', 'settings'] }]
      });
      return res.json({ success: true, data: user.toSafeObject() });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async logout(req, res) {
    try {
      await req.user.update({ isOnline: false, lastSeen: new Date() });
      return res.json({ success: true, message: 'Sesión cerrada' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Contraseñas requeridas' });
      }

      const user = await User.findByPk(req.user.id);
      const isValidPassword = await user.comparePassword(currentPassword);
      
      if (!isValidPassword) {
        return res.status(401).json({ success: false, message: 'Contraseña actual incorrecta' });
      }

      await user.update({ password: newPassword, tokenVersion: user.tokenVersion + 1 });

      const token = jwt.sign(
        { userId: user.id, tenantId: user.tenantId, tokenVersion: user.tokenVersion + 1 },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      return res.json({ success: true, message: 'Contraseña actualizada', data: { token } });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async updateProfile(req, res) {
    try {
      const { name, avatar, settings } = req.body;
      const updateData = {};
      if (name) updateData.name = name;
      if (avatar) updateData.avatar = avatar;
      if (settings) updateData.settings = { ...req.user.settings, ...settings };

      await req.user.update(updateData);

      const user = await User.findByPk(req.user.id, {
        include: [{ model: Tenant, as: 'tenant', attributes: ['id', 'uuid', 'name', 'slug', 'status', 'logo', 'primaryColor', 'secondaryColor', 'settings'] }]
      });

      return res.json({ success: true, data: user.toSafeObject() });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }

  async checkTenant(req, res) {
    try {
      const { slug } = req.params;
      const tenant = await Tenant.findOne({
        where: { slug },
        attributes: ['id', 'uuid', 'name', 'slug', 'status', 'logo', 'primaryColor', 'secondaryColor']
      });

      if (!tenant) {
        return res.status(404).json({ success: false, message: 'Plataforma no encontrada' });
      }

      if (tenant.status !== 'active') {
        return res.status(403).json({ success: false, message: 'Plataforma no disponible' });
      }

      return res.json({ success: true, data: tenant });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
  }
}

module.exports = new AuthController();
