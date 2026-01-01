const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const tenantRoutes = require('./tenants');
const userRoutes = require('./users');
const connectionRoutes = require('./connections');
const ticketRoutes = require('./tickets');
const contactRoutes = require('./contacts');

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'CRM API funcionando', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/tenants', tenantRoutes);
router.use('/users', userRoutes);
router.use('/connections', connectionRoutes);
router.use('/tickets', ticketRoutes);
router.use('/contacts', contactRoutes);

module.exports = router;
