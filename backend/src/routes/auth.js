const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { auth } = require('../middlewares');

router.post('/login', AuthController.login);
router.get('/tenant/:slug', AuthController.checkTenant);
router.get('/me', auth, AuthController.me);
router.post('/logout', auth, AuthController.logout);
router.put('/password', auth, AuthController.changePassword);
router.put('/profile', auth, AuthController.updateProfile);

module.exports = router;
