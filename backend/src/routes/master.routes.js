const express = require('express');
const router = express.Router();
const controller = require('../controllers/master.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/:type', controller.getAll);

module.exports = router;
