const express = require('express');
const router = express.Router();
const memberController = require('../controllers/member.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, memberController.getAll);
router.get('/search', authenticate, memberController.search);
router.get('/:id', authenticate, memberController.getById);
router.post('/', authenticate, authorize('OWNER', 'KASIR'), memberController.create);
router.put('/:id', authenticate, authorize('OWNER', 'KASIR'), memberController.update);
router.delete('/:id', authenticate, authorize('OWNER'), memberController.delete);

module.exports = router;
