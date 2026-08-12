const prisma = require('../config/database');
const { produceProduct } = require('../utils/stockManager');

exports.getAll = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { ingredients: { include: { ingredient: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(products);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { ingredients: { include: { ingredient: true } } },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, price, modalPrice, category, points, ingredients } = req.body;
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ error: 'Price must be greater than 0' });
    }
    const parsedModal = modalPrice ? parseFloat(modalPrice) : 0;
    if (parsedModal < 0) {
      return res.status(400).json({ error: 'Modal price cannot be negative' });
    }
    const product = await prisma.product.create({
      data: {
        name,
        price: parsedPrice,
        modalPrice: parsedModal,
        category,
        points: parseInt(points) || 0,
        ingredients: ingredients && ingredients.length > 0 ? {
          create: ingredients.map((i) => ({
            ingredientId: i.ingredientId,
            qty: parseFloat(i.qty),
            unit: i.unit,
          })),
        } : undefined,
      },
      include: { ingredients: { include: { ingredient: true } } },
    });
    res.status(201).json(product);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, price, modalPrice, category, points, isActive } = req.body;
    if (price !== undefined) {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({ error: 'Price must be greater than 0' });
      }
    }
    if (modalPrice !== undefined && parseFloat(modalPrice) < 0) {
      return res.status(400).json({ error: 'Modal price cannot be negative' });
    }
    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(name && { name }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(modalPrice !== undefined && { modalPrice: parseFloat(modalPrice) }),
        ...(category && { category }),
        ...(points !== undefined && { points: parseInt(points) }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json(product);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateIngredients = async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { ingredients } = req.body;

    await prisma.productIngredient.deleteMany({ where: { productId } });

    if (ingredients && ingredients.length > 0) {
      for (const i of ingredients) {
        await prisma.productIngredient.create({
          data: { productId, ingredientId: i.ingredientId, qty: parseFloat(i.qty), unit: i.unit },
        });
      }
    }

    const updated = await prisma.product.findUnique({
      where: { id: productId },
      include: { ingredients: { include: { ingredient: true } } },
    });
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: { isActive: false },
    });
    res.json({ message: 'Product deactivated' });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.produce = async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { qty, note } = req.body;

    if (!qty || qty <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId, isActive: true },
      include: { ingredients: { include: { ingredient: true } } },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.ingredients.length === 0) {
      return res.status(400).json({ error: 'Product has no ingredients (BOM). Cannot produce.' });
    }

    const bomPreview = product.ingredients.map(pi => ({
      name: pi.ingredient.name,
      stock: pi.ingredient.stock,
      needed: pi.qty * qty,
      unit: pi.unit,
    }));

    const insufficient = bomPreview.filter(b => b.stock < b.needed);
    if (insufficient.length > 0) {
      return res.status(400).json({ error: 'Bahan baku tidak cukup', details: insufficient });
    }

    await produceProduct(productId, qty, req.user.id, note);

    const updated = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, stock: true },
    });

    res.json({ message: `Produksi ${qty} ${product.name} berhasil`, stock: updated.stock, bomPreview });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.error, details: err.details });
    }
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};
