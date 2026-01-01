const express = require('express');
const router = express.Router();
const ContactController = require('../controllers/ContactController');
const { auth, requirePermission, tenantScope } = require('../middlewares');

router.use(auth);
router.use(tenantScope);

router.get('/', requirePermission('contacts', 'view'), ContactController.index);
router.get('/:id', requirePermission('contacts', 'view'), ContactController.show);
router.post('/', requirePermission('contacts', 'create'), ContactController.store);
router.put('/:id', requirePermission('contacts', 'edit'), ContactController.update);
router.delete('/:id', requirePermission('contacts', 'delete'), ContactController.destroy);
router.post('/:id/block', requirePermission('contacts', 'edit'), ContactController.block);

module.exports = router;
