const prisma = require('../config/database');
const { calculateProfitLoss } = require('../utils/calculator');

exports.getSummary = async (req, res) => {
  try {
    const { period = 'daily', startDate: customStart, endDate: customEnd } = req.query;
    const now = new Date();

    let currentStart, currentEnd, prevStart, prevEnd;
    let label, prevLabel;

    if (period === 'custom' && customStart && customEnd) {
      currentStart = new Date(customStart);
      currentStart.setHours(0, 0, 0, 0);
      currentEnd = new Date(customEnd);
      currentEnd.setHours(23, 59, 59, 999);

      const rangeMs = currentEnd - currentStart;
      prevStart = new Date(currentStart.getTime() - rangeMs);
      prevEnd = new Date(currentStart.getTime() - 1);

      label = customStart === customEnd
        ? new Date(customStart).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        : `${new Date(customStart).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${new Date(customEnd).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      prevLabel = 'Periode Sebelumnya';
    } else if (period === 'monthly') {
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      label = 'Bulan Ini';
      prevLabel = 'Bulan Lalu';
    } else if (period === 'yearly') {
      currentStart = new Date(now.getFullYear(), 0, 1);
      currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      prevStart = new Date(now.getFullYear() - 1, 0, 1);
      prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      label = 'Tahun Ini';
      prevLabel = 'Tahun Lalu';
    } else {
      currentStart = new Date(now);
      currentStart.setHours(0, 0, 0, 0);
      currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + 1);

      prevStart = new Date(currentStart);
      prevStart.setDate(prevStart.getDate() - 1);
      prevEnd = new Date(currentStart);
      label = 'Hari Ini';
      prevLabel = 'Kemarin';
    }

    const dateFilter = (gte, lte, isDaily) => {
      if (isDaily) return { gte, lt: lte };
      return { gte, lte };
    };

    const currentTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: dateFilter(currentStart, currentEnd, period === 'daily'),
        status: 'ACTIVE',
      },
    });

    const prevTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: dateFilter(prevStart, prevEnd, period === 'daily'),
        status: 'ACTIVE',
      },
    });

    const currentRevenue = currentTransactions.reduce((s, t) => s + (t.finalAmount - (t.taxAmount || 0)), 0);
    const currentCount = currentTransactions.length;

    const prevRevenue = prevTransactions.reduce((s, t) => s + (t.finalAmount - (t.taxAmount || 0)), 0);
    const prevCount = prevTransactions.length;

    const totalMembers = await prisma.member.count();
    const allIngredients = await prisma.ingredient.findMany();
    const lowStockIngredients = allIngredients.filter(ing => ing.stock <= ing.minStock);

    const negativeStockIngredients = await prisma.ingredient.findMany({
      where: { stock: { lt: 0 } },
      orderBy: { stock: 'asc' },
    });

    const outOfStockProducts = await prisma.product.findMany({
      where: {
        stock: { lte: 0 },
        isActive: true,
        ingredients: { some: {} },
      },
      include: { ingredients: { include: { ingredient: true } } },
    });

    const totalExpenses = await prisma.expense.aggregate({ _sum: { amount: true } });

    res.json({
      todayRevenue: currentRevenue,
      todayTransactionCount: currentCount,
      yesterdayRevenue: prevRevenue,
      yesterdayTransactionCount: prevCount,
      currentPeriodLabel: label,
      prevPeriodLabel: prevLabel,
      totalMembers,
      totalExpenses: totalExpenses._sum.amount || 0,
      lowStockCount: lowStockIngredients.length,
      lowStockIngredients,
      negativeStockIngredients,
      outOfStockProducts,
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getSalesChart = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const transactions = await prisma.transaction.findMany({
      where: { createdAt: { gte: startDate, lte: endDate }, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });

    const dailyMap = {};
    for (const t of transactions) {
      const key = t.createdAt.toISOString().split('T')[0];
      if (!dailyMap[key]) dailyMap[key] = { date: key, revenue: 0, count: 0 };
      dailyMap[key].revenue += t.finalAmount - (t.taxAmount || 0);
      dailyMap[key].count += 1;
    }

    const result = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const key = cursor.toISOString().split('T')[0];
      result.push(dailyMap[key] || { date: key, revenue: 0, count: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    res.json(result);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getProfitChart = async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const result = [];
    const now = new Date();

    for (let i = parseInt(months) - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const pl = await calculateProfitLoss(d, endOfMonth);

      result.push({
        month: d.toLocaleString('id-ID', { month: 'short', year: 'numeric' }),
        ...pl,
      });
    }

    res.json(result);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getTopProducts = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const activeTxns = await prisma.transaction.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });
    const activeIds = activeTxns.map(t => t.id);
    const items = await prisma.transactionItem.groupBy({
      by: ['productId'],
      where: { transactionId: { in: activeIds } },
      _sum: { qty: true },
      orderBy: { _sum: { qty: 'desc' } },
      take: parseInt(limit),
    });

    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = {};
    for (const p of products) productMap[p.id] = p;

    const result = items.map((i) => ({
      product: productMap[i.productId] || { id: i.productId, name: 'Unknown' },
      totalSold: i._sum.qty,
    }));

    res.json(result);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getPeakHours = async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { status: 'ACTIVE' },
      select: { createdAt: true },
    });

    const hourMap = {};
    for (let i = 0; i < 24; i++) hourMap[i] = { hour: i, count: 0 };

    for (const t of transactions) {
      const hour = new Date(t.createdAt).getHours();
      hourMap[hour].count += 1;
    }

    res.json(Object.values(hourMap));
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getSidebarNotifications = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [transactionsToday, newMembersToday, expensesToday, allIngredients, auditLogsToday] = await Promise.all([
      prisma.transaction.count({ where: { createdAt: { gte: todayStart, lte: todayEnd }, status: 'ACTIVE' } }),
      prisma.member.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
      prisma.expense.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
      prisma.ingredient.findMany(),
      prisma.auditLog.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
    ]);

    const lowStockCount = allIngredients.filter(ing => ing.stock <= ing.minStock).length;

    res.json({
      transactionsToday,
      newMembersToday,
      expensesToday,
      lowStockCount,
      auditLogsToday,
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getMemberSummary = async (req, res) => {
  try {
    const totalMembers = await prisma.member.count();
    const topMembers = await prisma.member.findMany({
      orderBy: { totalPoints: 'desc' },
      take: 5,
      include: { _count: { select: { transactions: { where: { status: 'ACTIVE' } } } } },
    });
    const totalPointsRedeemed = await prisma.pointHistory.aggregate({
      _sum: { points: true },
      where: { type: 'REDEEMED' },
    });

    res.json({
      totalMembers,
      topMembers,
      totalPointsRedeemed: Math.abs(totalPointsRedeemed._sum.points || 0),
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};
