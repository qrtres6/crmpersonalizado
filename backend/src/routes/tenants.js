const express = require('express');
const router = express.Router();
const TenantController = require('../controllers/TenantController');
const { auth, requireRole } = require('../middlewares');

router.use(auth);
router.use(requireRole('super_admin'));

router.get('/', TenantController.index);
router.get('/:id', TenantController.show);
router.post('/', TenantController.store);
router.put('/:id', TenantController.update);
router.delete('/:id', TenantController.destroy);
router.get('/:id/users', TenantController.getUsers);

module.exports = router;
