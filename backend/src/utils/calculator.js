const prisma = require('../config/database');

async function calculateProfitLoss(startDate, endDate) {
  const transactions = await prisma.transaction.findMany({
    where: {
      createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
      status: 'ACTIVE',
    },
    include: { items: true },
  });

  const expenses = await prisma.expense.findMany({
    where: {
      date: { gte: new Date(startDate), lte: new Date(endDate) },
      status: 'APPROVED',
    },
  });

  const totalRevenue = transactions.reduce((sum, t) => sum + (t.finalAmount - (t.taxAmount || 0)), 0);
  const totalTax = transactions.reduce((sum, t) => sum + (t.taxAmount || 0), 0);

  const productIds = [...new Set(transactions.flatMap(t => t.items.map(i => i.productId)))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = {};
  for (const p of products) productMap[p.id] = p;

  let totalCogs = 0;
  for (const t of transactions) {
    for (const item of t.items) {
      const modalPrice = productMap[item.productId]?.modalPrice || 0;
      totalCogs += modalPrice * item.qty;
    }
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalVoucherCogs = transactions.reduce((sum, t) => sum + (t.voucherCogs || 0), 0);
  const totalCost = totalCogs + totalExpenses;
  const profit = totalRevenue - totalCost;
  const profitPercentage = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  return {
    totalRevenue,
    totalTax,
    totalCogs,
    totalVoucherCogs,
    totalExpenses,
    totalCost,
    profit,
    profitPercentage: Math.round(profitPercentage * 100) / 100,
    status: profit >= 0 ? 'UNTUNG' : 'RUGI',
    transactionCount: transactions.length,
    expenseCount: expenses.length,
  };
}

module.exports = { calculateProfitLoss };
