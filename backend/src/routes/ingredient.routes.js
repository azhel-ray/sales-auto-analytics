const express = require('express');
const router = express.Router();
const ingredientController = require('../controllers/ingredient.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, ingredientController.getAll);
router.post('/', authenticate, authorize('OWNER'), ingredientController.create);
router.put('/:id', authenticate, authorize('OWNER'), ingredientController.update);
router.post('/:id/restock', authenticate, authorize('OWNER'), ingredientController.restock);
router.delete('/:id', authenticate, authorize('OWNER'), ingredientController.remove);

module.exports = router;
