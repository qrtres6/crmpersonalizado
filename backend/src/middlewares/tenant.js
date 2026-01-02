const { Tenant } = require('../models');

const tenantScope = async (req, res, next) => {
  try {
    if (req.user.role === 'super_admin') {
      if (req.query.tenantId) {
        req.tenantId = parseInt(req.query.tenantId);
        req.tenant = await Tenant.findByPk(req.tenantId);
      }
      return next();
    }
    if (!req.user.tenantId) {
      return res.status(403).json({ success: false, message: 'Usuario sin tenant asignado' });
    }
    req.tenantId = req.user.tenantId;
    req.tenant = await Tenant.findByPk(req.tenantId);
    if (!req.tenant || req.tenant.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Tenant inactivo' });
    }
    next();
  } catch (error) {
    console.error('Error tenant middleware:', error);
    return res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
};

const withTenant = (req) => {
  if (req.user.role === 'super_admin' && !req.tenantId) return {};
  return { tenantId: req.tenantId };
};

const requirePermission = (module, action) => {
  return (req, res, next) => {
    if (req.user.role === 'super_admin') return next();
    if (req.user.role === 'admin') return next();
    const permissions = req.user.permissions || {};
    if (permissions[module]?.[action]) return next();
    return res.status(403).json({ success: false, message: 'Sin permisos' });
  };
};

module.exports = { tenantScope, withTenant, requirePermission };
