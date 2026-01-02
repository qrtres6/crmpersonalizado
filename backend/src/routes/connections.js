const express = require('express');
const router = express.Router();
const ConnectionController = require('../controllers/ConnectionController');
const { auth, tenantScope } = require('../middlewares');

// Webhooks Meta (sin auth)
router.get('/webhook/meta', ConnectionController.metaWebhookGet);
router.post('/webhook/meta', ConnectionController.metaWebhookPost);

// Rutas protegidas
router.use(auth);
router.use(tenantScope);

router.get('/', ConnectionController.index);
router.post('/', ConnectionController.store);
router.put('/:id', ConnectionController.update);
router.post('/:id/connect', ConnectionController.connect);
router.post('/:id/disconnect', ConnectionController.disconnect);
router.delete('/:id', ConnectionController.destroy);
router.get('/:id/status', ConnectionController.status);

module.exports = router;
