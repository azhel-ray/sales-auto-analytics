const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('OWNER'), auditController.getAll);

module.exports = router;