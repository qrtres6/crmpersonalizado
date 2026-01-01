const { auth, requireRole, requirePermission, optionalAuth } = require('./auth');
const { tenantScope, withTenant, verifyResourceTenant } = require('./tenant');

module.exports = {
  auth,
  requireRole,
  requirePermission,
  optionalAuth,
  tenantScope,
  withTenant,
  verifyResourceTenant
};
