const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, transactionController.getAll);
router.get('/:id', authenticate, transactionController.getById);
router.post('/', authenticate, authorize('OWNER', 'KASIR'), transactionController.create);
router.post('/:id/void', authenticate, authorize('OWNER', 'KASIR'), transactionController.voidTransaction);

module.exports = router;
