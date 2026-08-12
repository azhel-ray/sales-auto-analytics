const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/ingredient-mutations', authenticate, authorize('OWNER'), inventoryController.getIngredientMutations);
router.get('/productions', authenticate, authorize('OWNER'), inventoryController.getProductions);

module.exports = router;
