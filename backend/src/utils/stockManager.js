const prisma = require('../config/database');

async function restockIngredient(ingredientId, qty, note) {
  if (!qty || qty <= 0) {
    throw new Error('Quantity must be greater than 0');
  }

  const ingredient = await prisma.ingredient.update({
    where: { id: ingredientId },
    data: { stock: { increment: qty } },
  });

  await prisma.inventoryMutation.create({
    data: {
      ingredientId,
      type: 'IN',
      qty,
      reference: 'restock',
      note: note || 'Manual restock',
    },
  });

  return ingredient;
}

async function produceProduct(productId, qty, userId, note, tx) {
  const db = tx || prisma;
  const ingredients = await db.productIngredient.findMany({
    where: { productId },
    include: { ingredient: true },
  });

  if (ingredients.length === 0) {
    throw new Error('Product has no ingredients (BOM)');
  }

  const errors = [];
  for (const pi of ingredients) {
    const totalNeeded = pi.qty * qty;
    const updated = await db.ingredient.updateMany({
      where: { id: pi.ingredientId, stock: { gte: totalNeeded } },
      data: { stock: { decrement: totalNeeded } },
    });
    if (updated.count === 0) {
      const current = await db.ingredient.findUnique({ where: { id: pi.ingredientId } });
      errors.push({
        name: pi.ingredient.name,
        stock: current?.stock || 0,
        needed: totalNeeded,
      });
    }
  }

  if (errors.length > 0) {
    throw { status: 400, error: 'Bahan baku tidak cukup', details: errors };
  }

  await db.product.update({
    where: { id: productId },
    data: { stock: { increment: qty } },
  });

  for (const pi of ingredients) {
    await db.inventoryMutation.create({
      data: {
        ingredientId: pi.ingredientId,
        type: 'OUT',
        qty: pi.qty * qty,
        reference: `production-${productId}`,
        note: note || `Produksi ${qty}x product #${productId}`,
      },
    });
  }

  const prod = await db.production.create({
    data: { productId, qty, userId, note },
  });

  await db.productMutation.create({
    data: {
      productId,
      type: 'IN',
      qty,
      reference: `production-${prod.id}`,
      note: note || `Produksi ${qty}x ${productId}`,
    },
  });
}

async function deductProductStock(productId, qtyTx, tx, reference) {
  const db = tx || prisma;

  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) {
    return { success: false, errors: [{ message: `Product ${productId} not found` }] };
  }

  await db.product.update({
    where: { id: productId },
    data: { stock: { decrement: qtyTx } },
  });

  await db.productMutation.create({
    data: {
      productId,
      type: 'OUT',
      qty: qtyTx,
      reference: reference || `transaction-${productId}`,
      note: `Penjualan ${qtyTx}x ${product.name}`,
    },
  });

  if (product.stock < qtyTx) {
    return {
      success: true,
      warning: `Stok ${product.name} menipis (tersisa ${Math.max(0, product.stock - qtyTx)}), segera produksi`,
    };
  }

  return { success: true };
}

async function checkVoucherThresholds(memberId, totalPoints, tx) {
  const db = tx || prisma;
  const rewards = await prisma.voucherReward.findMany({ where: { isActive: true } });

  const existingVouchers = await db.voucher.findMany({
    where: {
      memberId,
      type: { in: rewards.map((r) => r.name) },
    },
  });

  const existingTypes = new Set(existingVouchers.map((v) => v.type));

  for (const reward of rewards) {
    if (totalPoints >= reward.pointsCost && !existingTypes.has(reward.name)) {
      const voucherCode = `VCH-${memberId}-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      await db.voucher.create({
        data: {
          memberId,
          rewardId: reward.id,
          type: reward.name,
          code: voucherCode,
          discountPct: reward.discountPct || null,
          freeItem: reward.freeItem || null,
          pointsCost: reward.pointsCost,
        },
      });
    }
  }
}

module.exports = { restockIngredient, checkVoucherThresholds, produceProduct, deductProductStock };
