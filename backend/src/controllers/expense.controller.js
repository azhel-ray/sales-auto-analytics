const prisma = require('../config/database');

exports.getAll = async (req, res) => {
  try {
    const { startDate, endDate, category, status } = req.query;
    const where = {};
    if (startDate && endDate) where.date = { gte: new Date(startDate), lte: new Date(endDate) };
    if (category) where.category = category;
    if (status) where.status = status;

    const expenses = await prisma.expense.findMany({
      where,
      include: { user: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });
    res.json(expenses);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { description, amount, category, date } = req.body;
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }
    const isOwner = req.user.role === 'OWNER';
    const expense = await prisma.expense.create({
      data: {
        description,
        amount: parsedAmount,
        category: category || 'other',
        status: isOwner ? 'APPROVED' : 'PENDING',
        userId: req.user.id,
        date: date ? new Date(date) : new Date(),
      },
      include: { user: { select: { id: true, name: true } } },
    });
    res.status(201).json(expense);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.approve = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Expense not found' });
    if (existing.status !== 'PENDING') {
      return res.status(400).json({ error: 'Expense is not pending' });
    }
    const expense = await prisma.expense.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
    res.json(expense);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.reject = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Expense not found' });
    if (existing.status !== 'PENDING') {
      return res.status(400).json({ error: 'Expense is not pending' });
    }
    const expense = await prisma.expense.update({
      where: { id },
      data: { status: 'REJECTED' },
    });
    res.json(expense);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};
