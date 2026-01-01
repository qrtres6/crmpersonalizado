const express = require('express');
const router = express.Router();
const ConnectionController = require('../controllers/ConnectionController');
const { auth, requirePermission, tenantScope } = require('../middlewares');

// Webhook Meta (sin autenticación)
router.get('/webhook/meta', ConnectionController.metaWebhook);
router.post('/webhook/meta', ConnectionController.metaWebhook);

// Rutas protegidas
router.use(auth);
router.use(tenantScope);

router.get('/', requirePermission('connections', 'view'), ConnectionController.index);
router.get('/:id', requirePermission('connections', 'view'), ConnectionController.show);
router.post('/', requirePermission('connections', 'create'), ConnectionController.store);
router.put('/:id', requirePermission('connections', 'edit'), ConnectionController.update);
router.delete('/:id', requirePermission('connections', 'delete'), ConnectionController.destroy);

router.post('/:id/connect', requirePermission('connections', 'edit'), ConnectionController.connect);
router.post('/:id/disconnect', requirePermission('connections', 'edit'), ConnectionController.disconnect);
router.get('/:id/status', requirePermission('connections', 'view'), ConnectionController.status);

module.exports = router;
