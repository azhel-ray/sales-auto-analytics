const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, expenseController.getAll);
router.post('/', authenticate, authorize('OWNER', 'KASIR'), expenseController.create);
router.post('/:id/approve', authenticate, authorize('OWNER'), expenseController.approve);
router.post('/:id/reject', authenticate, authorize('OWNER'), expenseController.reject);

module.exports = router;
