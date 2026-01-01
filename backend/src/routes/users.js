const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const { auth, requirePermission, tenantScope } = require('../middlewares');

router.use(auth);
router.use(tenantScope);

router.get('/online', UserController.online);
router.get('/', requirePermission('users', 'view'), UserController.index);
router.get('/:id', requirePermission('users', 'view'), UserController.show);
router.post('/', requirePermission('users', 'create'), UserController.store);
router.put('/:id', requirePermission('users', 'edit'), UserController.update);
router.delete('/:id', requirePermission('users', 'delete'), UserController.destroy);

module.exports = router;
