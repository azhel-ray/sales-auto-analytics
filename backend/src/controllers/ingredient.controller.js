const prisma = require('../config/database');
const { restockIngredient } = require('../utils/stockManager');

exports.getAll = async (req, res) => {
  try {
    const ingredients = await prisma.ingredient.findMany({ orderBy: { name: 'asc' } });
    res.json(ingredients);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, unit, stock, minStock } = req.body;
    const ingredient = await prisma.ingredient.create({
      data: { name, unit, stock: parseFloat(stock) || 0, minStock: parseFloat(minStock) || 0 },
    });
    res.status(201).json(ingredient);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, unit, minStock } = req.body;
    const ingredient = await prisma.ingredient.update({
      where: { id: parseInt(req.params.id) },
      data: { ...(name && { name }), ...(unit && { unit }), ...(minStock !== undefined && { minStock: parseFloat(minStock) }) },
    });
    res.json(ingredient);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.restock = async (req, res) => {
  try {
    const { qty, note } = req.body;
    const ingredient = await restockIngredient(parseInt(req.params.id), parseFloat(qty), note);
    res.json(ingredient);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    await prisma.ingredient.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Ingredient deleted' });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};
