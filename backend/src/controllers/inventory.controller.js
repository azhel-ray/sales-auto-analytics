const prisma = require('../config/database');

exports.getIngredientMutations = async (req, res) => {
  try {
    const { ingredientId, startDate, endDate } = req.query;
    const where = {};
    if (ingredientId) where.ingredientId = parseInt(ingredientId);
    if (startDate && endDate) where.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };

    const mutations = await prisma.inventoryMutation.findMany({
      where,
      include: { ingredient: { select: { id: true, name: true, unit: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(mutations);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getProductions = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate && endDate) where.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };

    const productions = await prisma.production.findMany({
      where,
      include: {
        product: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(productions);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};


