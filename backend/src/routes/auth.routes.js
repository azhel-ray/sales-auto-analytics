const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/register', authenticate, authorize('OWNER'), authController.register);
router.post('/login', authController.login);
router.get('/users', authenticate, authorize('OWNER'), authController.getUsers);
router.put('/users/:id', authenticate, authorize('OWNER'), authController.updateUser);
router.delete('/users/:id', authenticate, authorize('OWNER'), authController.deleteUser);

module.exports = router;
