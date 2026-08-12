const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, productController.getAll);
router.get('/:id', authenticate, productController.getById);
router.post('/', authenticate, authorize('OWNER'), productController.create);
router.put('/:id', authenticate, authorize('OWNER'), productController.update);
router.put('/:id/ingredients', authenticate, authorize('OWNER'), productController.updateIngredients);
router.delete('/:id', authenticate, authorize('OWNER'), productController.remove);
router.post('/:id/produce', authenticate, authorize('OWNER'), productController.produce);

module.exports = router;
