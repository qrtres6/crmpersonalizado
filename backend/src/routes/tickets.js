const express = require('express');
const router = express.Router();
const TicketController = require('../controllers/TicketController');
const { auth, requirePermission, tenantScope } = require('../middlewares');

router.use(auth);
router.use(tenantScope);

router.get('/', requirePermission('tickets', 'view'), TicketController.index);
router.get('/:id', requirePermission('tickets', 'view'), TicketController.show);
router.put('/:id', requirePermission('tickets', 'edit'), TicketController.update);
router.post('/:id/close', requirePermission('tickets', 'edit'), TicketController.close);
router.post('/:id/transfer', requirePermission('tickets', 'transfer'), TicketController.transfer);

router.get('/:id/messages', requirePermission('tickets', 'view'), TicketController.messages);
router.post('/:id/messages', requirePermission('tickets', 'create'), TicketController.sendMessage);

module.exports = router;
