const prisma = require('../config/database');
const { deductProductStock, checkVoucherThresholds } = require('../utils/stockManager');
const audit = require('./audit.controller');

exports.getAll = async (req, res) => {
  try {
    const { startDate, endDate, memberId } = req.query;
    const where = {};
    if (startDate && endDate) {
      where.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
    }
    if (memberId) where.memberId = parseInt(memberId);

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        items: { include: { product: true } },
        member: true,
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(transactions);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        items: { include: { product: true } },
        member: true,
        user: { select: { id: true, name: true } },
        usages: { include: { voucher: true } },
      },
    });
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.json(transaction);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { items, paymentMethod, memberId, voucherId, pointsToRedeem, redeemDiscountType, taxPct } = req.body;
    const userId = req.user.id;
    let voucherCogs = 0;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items required' });
    }
    for (const item of items) {
      if (!item.qty || item.qty <= 0) {
        return res.status(400).json({ error: `Invalid qty for product ${item.productId}` });
      }
    }

    const validMethods = ['cash', 'qris', 'transfer'];
    const payMethod = validMethods.includes(paymentMethod) ? paymentMethod : 'cash';

    const products = await prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
      include: { ingredients: { include: { ingredient: true } } },
    });

    const productMap = {};
    for (const p of products) productMap[p.id] = p;

    let totalAmount = 0;
    let totalPointsEarned = 0;
    const transactionItems = items.map((item) => {
      const product = productMap[item.productId];
      if (!product) throw new Error(`Product ${item.productId} not found`);
      totalAmount += product.price * item.qty;
      totalPointsEarned += product.points * item.qty;
      return { productId: item.productId, qty: item.qty, price: product.price };
    });

    const now = new Date();
    const ts = now.getTime();
    const rand = Math.random().toString(36).substr(2, 4).toUpperCase();
    const invoiceNumber = `INV-${ts}-${rand}`;

    const transaction = await prisma.$transaction(async (tx) => {
      let discountPct = 0;
      let discountAmount = 0;

      if (voucherId) {
        const voucher = await tx.voucher.findUnique({ where: { id: voucherId } });
        if (voucher && !voucher.isUsed && voucher.memberId === memberId) {
          if (voucher.freeItem) {
            const freeProduct = [...products].find(p => p.name === voucher.freeItem);
            const matchedItem = items.find(i => i.productId === (freeProduct?.id));
            if (!matchedItem || !freeProduct) throw new Error(`Tidak ada produk "${voucher.freeItem}" di keranjang`);
            discountAmount = freeProduct.price;
            voucherCogs = freeProduct.modalPrice || 0;
          } else if (voucher.discountPct) {
            discountPct = voucher.discountPct;
            discountAmount = (totalAmount * discountPct) / 100;
          }
        }
      } else if (pointsToRedeem && redeemDiscountType && memberId) {
        const member = await tx.member.findUnique({ where: { id: memberId } });
        if (!member) throw new Error('Member not found');
        if (member.points < pointsToRedeem) throw new Error('Insufficient points');

        const reward = await prisma.voucherReward.findFirst({ where: { name: redeemDiscountType, isActive: true } });
        if (!reward) throw new Error('Voucher reward tidak valid');

        if (reward.freeItem) {
          const freeProduct = Object.values(productMap).find(p => p.name === reward.freeItem);
          const matchedItem = items.find(i => i.productId === (freeProduct?.id));
          if (!matchedItem) throw new Error(`Tidak ada produk "${reward.freeItem}" di keranjang`);
          const product = productMap[matchedItem.productId];
          discountAmount = product.price;
          discountPct = 0;
          voucherCogs = product.modalPrice || 0;
        } else if (reward.discountPct) {
          discountPct = reward.discountPct;
          discountAmount = (totalAmount * reward.discountPct) / 100;
        }
      }

      let finalAmount = totalAmount - discountAmount;
      const taxPctVal = Math.max(0, Math.min(100, parseFloat(taxPct) || 0));
      const taxAmount = (finalAmount * taxPctVal) / 100;
      finalAmount = finalAmount + taxAmount;

      let stockWarnings = [];
      for (const item of items) {
        const result = await deductProductStock(item.productId, item.qty, tx, invoiceNumber);
        if (!result.success) {
          throw { status: 400, error: 'Insufficient stock', details: result.errors };
        }
        if (result.warning) {
          stockWarnings.push(result.warning);
        }
      }

      const trans = await tx.transaction.create({
        data: {
          invoiceNumber,
          memberId: memberId || null,
          userId,
          voucherId: voucherId || null,
          totalAmount,
          discountPct,
          discountAmount,
          taxPct: taxPctVal,
          taxAmount,
          finalAmount,
          paymentMethod: payMethod,
          pointsEarned: totalPointsEarned,
          voucherCogs,
          items: { create: transactionItems },
        },
      });

      if (voucherId) {
        const updated = await tx.voucher.updateMany({
          where: { id: voucherId, isUsed: false },
          data: { isUsed: true, usedAt: new Date() },
        });
        if (updated.count === 0) {
          throw new Error('Voucher already used');
        }

        await tx.voucherUsage.create({
          data: { voucherId, transactionId: trans.id, discountAmount },
        });
      }

      if (memberId) {
        await tx.member.update({
          where: { id: memberId },
          data: {
            points: { increment: totalPointsEarned },
            totalPoints: { increment: totalPointsEarned },
          },
        });

        await tx.pointHistory.create({
          data: {
            memberId,
            transactionId: trans.id,
            points: totalPointsEarned,
            type: 'EARNED',
            description: `Points from transaction ${invoiceNumber}`,
          },
        });
      }

      if (pointsToRedeem && redeemDiscountType && memberId) {
        const reward = await prisma.voucherReward.findFirst({ where: { name: redeemDiscountType, isActive: true } });
        const voucherCode = `REDEEM-${memberId}-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

        const autoVoucher = await tx.voucher.create({
          data: {
            memberId,
            rewardId: reward?.id || null,
            type: redeemDiscountType,
            code: voucherCode,
            discountPct: reward?.discountPct || null,
            freeItem: reward?.freeItem || null,
            pointsCost: pointsToRedeem,
            isUsed: true,
            usedAt: new Date(),
          },
        });

        await tx.voucherUsage.create({
          data: { voucherId: autoVoucher.id, transactionId: trans.id, discountAmount },
        });

        await tx.member.update({
          where: { id: memberId },
          data: { points: { decrement: pointsToRedeem } },
        });

        await tx.pointHistory.create({
          data: {
            memberId,
            transactionId: trans.id,
            points: -pointsToRedeem,
            type: 'REDEEMED',
            description: `Auto-redeemed ${redeemDiscountType} (${pointsToRedeem} points) for ${invoiceNumber}`,
          },
        });
      }

      return { trans, stockWarnings };
    });

    if (memberId) {
      const updatedMember = await prisma.member.findUnique({ where: { id: memberId } });
      await checkVoucherThresholds(memberId, updatedMember.totalPoints);
    }

    const result = await prisma.transaction.findUnique({
      where: { id: transaction.trans.id },
      include: {
        items: { include: { product: true } },
        member: true,
        usages: { include: { voucher: true } },
      },
    });

    const responseData = { ...result, pointsRedeemed: pointsToRedeem || 0 };
    if (transaction.stockWarnings.length > 0) {
      responseData.stockWarnings = transaction.stockWarnings;
    }
    res.status(201).json(responseData);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.error, details: err.details });
    }
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.voidTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const transaction = await prisma.transaction.findUnique({
      where: { id: parseInt(id) },
      include: { items: true, member: true },
    });

    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    if (transaction.status === 'VOIDED') return res.status(400).json({ error: 'Transaksi sudah di-void' });

    // Safeguard: only allow void within 24 hours
    const diff = Date.now() - new Date(transaction.createdAt).getTime();
    if (diff > 24 * 60 * 60 * 1000) {
      return res.status(403).json({ error: 'Refund hanya bisa dilakukan dalam 1x24 jam setelah transaksi.' });
    }

    await prisma.$transaction(async (tx) => {
      for (const item of transaction.items) {
        // Restore stock for ALL products (not just BOM)
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.qty } },
        });
        await tx.productMutation.create({
          data: {
            productId: item.productId,
            type: 'IN',
            qty: item.qty,
            reference: `void-${transaction.invoiceNumber}`,
            note: `Refund/Void transaksi ${transaction.invoiceNumber}`,
          },
        });
      }

      if (transaction.memberId) {
        const pointsToReverse = transaction.pointsEarned;
        if (pointsToReverse > 0) {
          await tx.member.update({
            where: { id: transaction.memberId },
            data: { points: { decrement: pointsToReverse }, totalPoints: { decrement: pointsToReverse } },
          });
          await tx.pointHistory.create({
            data: {
              memberId: transaction.memberId,
              transactionId: transaction.id,
              points: -pointsToReverse,
              type: 'VOID',
              description: `Refund/Void transaction ${transaction.invoiceNumber}`,
            },
          });
        }
      }

      if (transaction.voucherId) {
        await tx.voucher.update({
          where: { id: transaction.voucherId },
          data: { isUsed: false, usedAt: null },
        });
      }

      await tx.transaction.update({
        where: { id: transaction.id },
        data: { status: 'VOIDED', voidReason: reason || null, voidedAt: new Date(), voidedBy: userId },
      });
    });

    const result = await prisma.transaction.findUnique({
      where: { id: transaction.id },
      include: {
        items: { include: { product: true } },
        member: true,
        user: { select: { id: true, name: true, role: true } },
      },
    });

    await audit.log(userId, 'VOID', 'Transaction', transaction.id, { invoiceNumber: transaction.invoiceNumber, reason });
    res.json({ message: 'Transaksi berhasil di-void', transaction: result });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};
