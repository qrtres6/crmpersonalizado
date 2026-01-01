const jwt = require('jsonwebtoken');
const { User, Tenant } = require('../models');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findOne({
      where: { id: decoded.userId, tokenVersion: decoded.tokenVersion },
      include: [{ model: Tenant, as: 'tenant', attributes: ['id', 'uuid', 'name', 'slug', 'status', 'settings'] }]
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Token inválido' });
    }

    if (user.status === 'inactive') {
      return res.status(401).json({ success: false, message: 'Usuario desactivado' });
    }

    if (user.role !== 'super_admin' && user.tenant && user.tenant.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Tenant suspendido' });
    }

    req.user = user;
    req.tenantId = user.tenantId;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expirado' });
    }
    return res.status(401).json({ success: false, message: 'Token inválido' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'No tienes permisos' });
    }
    next();
  };
};

const requirePermission = (module, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }
    if (req.user.role === 'super_admin' || req.user.role === 'admin') {
      return next();
    }
    const permissions = req.user.permissions || {};
    if (!permissions[module] || !permissions[module][action]) {
      return res.status(403).json({ success: false, message: 'No tienes permisos' });
    }
    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findOne({ where: { id: decoded.userId, tokenVersion: decoded.tokenVersion } });
      if (user && user.status === 'active') {
        req.user = user;
        req.tenantId = user.tenantId;
      }
    }
    next();
  } catch (error) {
    next();
  }
};

module.exports = { auth, requireRole, requirePermission, optionalAuth };
