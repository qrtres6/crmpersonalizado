const { Tenant } = require('../models');

const tenantScope = async (req, res, next) => {
  try {
    if (req.user && req.user.role === 'super_admin') {
      const requestedTenantId = req.query.tenantId || req.params.tenantId;
      if (requestedTenantId) {
        const tenant = await Tenant.findByPk(requestedTenantId);
        if (!tenant) {
          return res.status(404).json({ success: false, message: 'Tenant no encontrado' });
        }
        req.tenantId = parseInt(requestedTenantId);
        req.tenant = tenant;
      }
      return next();
    }

    if (!req.tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant no especificado' });
    }

    if (!req.user.tenant) {
      const tenant = await Tenant.findByPk(req.tenantId);
      if (!tenant) {
        return res.status(404).json({ success: false, message: 'Tenant no encontrado' });
      }
      req.tenant = tenant;
    } else {
      req.tenant = req.user.tenant;
    }

    next();
  } catch (error) {
    console.error('Error en tenantScope:', error);
    return res.status(500).json({ success: false, message: 'Error verificando tenant' });
  }
};

const withTenant = (req, where = {}) => {
  if (req.user && req.user.role === 'super_admin' && !req.tenantId) {
    return where;
  }
  return { ...where, tenantId: req.tenantId };
};

const verifyResourceTenant = (model) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      if (!resourceId) return next();

      const resource = await model.findByPk(resourceId);
      if (!resource) {
        return res.status(404).json({ success: false, message: 'Recurso no encontrado' });
      }

      if (req.user.role === 'super_admin') {
        req.resource = resource;
        return next();
      }

      if (resource.tenantId !== req.tenantId) {
        return res.status(403).json({ success: false, message: 'No tienes acceso' });
      }

      req.resource = resource;
      next();
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error verificando acceso' });
    }
  };
};

module.exports = { tenantScope, withTenant, verifyResourceTenant };
