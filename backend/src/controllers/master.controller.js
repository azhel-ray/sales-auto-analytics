const prisma = require('../config/database');

const MODELS = {
  'product-categories': 'productCategory',
  'expense-categories': 'expenseCategory',
  'ingredient-units': 'ingredientUnit',
  'payment-methods': 'paymentMethod',
};

exports.getAll = async (req, res) => {
  try {
    const { type } = req.params;
    const model = MODELS[type];
    if (!model) return res.status(400).json({ error: 'Invalid master data type' });
    const data = await prisma[model].findMany({ orderBy: { id: 'asc' } });
    res.json(data);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};


