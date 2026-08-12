const express = require('express');
const router = express.Router();
const controller = require('../controllers/settings.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', controller.getAll);

module.exports = router;
