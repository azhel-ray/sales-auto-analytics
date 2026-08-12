const express = require('express');
const router = express.Router();
const controller = require('../controllers/voucherReward.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', controller.getAll);
router.post('/', authorize('OWNER'), controller.create);
router.put('/:id', authorize('OWNER'), controller.update);
router.delete('/:id', authorize('OWNER'), controller.remove);
router.delete('/:id/hard', authorize('OWNER'), controller.hardDelete);

module.exports = router;
