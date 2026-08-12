const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data (order respects foreign keys)
  await prisma.voucherUsage.deleteMany();
  await prisma.pointHistory.deleteMany();
  await prisma.transactionItem.deleteMany();
  await prisma.inventoryMutation.deleteMany();
  await prisma.production.deleteMany();
  await prisma.productMutation.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.productIngredient.deleteMany();
  await prisma.product.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.member.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleaned existing data');

  const hashedPassword = await bcrypt.hash('admin123', 10);

  const owner = await prisma.user.upsert({
    where: { email: 'owner@geprek.com' },
    update: {},
    create: {
      name: 'Owner Utama',
      email: 'owner@geprek.com',
      password: hashedPassword,
      role: 'OWNER',
      storeName: 'Ayam Geprek Sukses',
    },
  });

  await prisma.user.upsert({
    where: { email: 'kasir@geprek.com' },
    update: {},
    create: {
      name: 'Kasir 1',
      email: 'kasir@geprek.com',
      password: hashedPassword,
      role: 'KASIR',
      storeName: 'Ayam Geprek Sukses',
    },
  });

  console.log('Users seeded:', owner.name);

  const ingredients = [
    { name: 'Ayam', unit: 'ekor', stock: 100, minStock: 10 },
    { name: 'Tepung', unit: 'gram', stock: 5000, minStock: 500 },
    { name: 'Sambal', unit: 'sachet', stock: 200, minStock: 20 },
    { name: 'Beras', unit: 'gram', stock: 10000, minStock: 1000 },
    { name: 'Teh Celup', unit: 'pcs', stock: 500, minStock: 50 },
    { name: 'Gula', unit: 'gram', stock: 3000, minStock: 300 },
  ];

  for (const ing of ingredients) {
    await prisma.ingredient.upsert({
      where: { name: ing.name },
      update: {},
      create: ing,
    });
  }

  console.log('Ingredients seeded');

  const products = [
    { name: 'Ayam Kecil', price: 12000, modalPrice: 7000, category: 'ayam', points: 10 },
    { name: 'Ayam Besar', price: 18000, modalPrice: 10000, category: 'ayam', points: 15 },
    { name: 'Nasi Putih', price: 4000, modalPrice: 2000, category: 'nasi', points: 5 },
    { name: 'Es Teh Manis', price: 5000, modalPrice: 1500, category: 'minuman', points: 8 },
    { name: 'Es Teh Tawar', price: 3000, modalPrice: 1000, category: 'minuman', points: 4 },
    { name: 'Paket Special (Ayam+Nasi+Teh Manis)', price: 25000, modalPrice: 13000, category: 'paketan', points: 25 },
    { name: 'Paket Special (Ayam+Nasi+Teh Tawar)', price: 23000, modalPrice: 12000, category: 'paketan', points: 5 },
  ];

  for (const p of products) {
    const existing = await prisma.product.findFirst({ where: { name: p.name } });
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data: p });
    } else {
      await prisma.product.create({ data: p });
    }
  }

  console.log('Products seeded');

  const ayamGoreng = await prisma.product.findFirst({ where: { name: 'Ayam Kecil' } });
  const nasiPutih = await prisma.product.findFirst({ where: { name: 'Nasi Putih' } });
  const esTehManis = await prisma.product.findFirst({ where: { name: 'Es Teh Manis' } });
  const ayam = await prisma.ingredient.findFirst({ where: { name: 'Ayam' } });
  const tepung = await prisma.ingredient.findFirst({ where: { name: 'Tepung' } });
  const sambal = await prisma.ingredient.findFirst({ where: { name: 'Sambal' } });
  const beras = await prisma.ingredient.findFirst({ where: { name: 'Beras' } });
  const teh = await prisma.ingredient.findFirst({ where: { name: 'Teh Celup' } });
  const gula = await prisma.ingredient.findFirst({ where: { name: 'Gula' } });

  const recipes = [
    { productName: 'Ayam Kecil', items: [
      { ingredientId: ayam.id, qty: 1, unit: 'ekor' },
      { ingredientId: tepung.id, qty: 50, unit: 'gram' },
      { ingredientId: sambal.id, qty: 1, unit: 'sachet' },
    ]},
    { productName: 'Ayam Besar', items: [
      { ingredientId: ayam.id, qty: 1.5, unit: 'ekor' },
      { ingredientId: tepung.id, qty: 75, unit: 'gram' },
      { ingredientId: sambal.id, qty: 2, unit: 'sachet' },
    ]},
    { productName: 'Nasi Putih', items: [
      { ingredientId: beras.id, qty: 100, unit: 'gram' },
    ]},
    { productName: 'Es Teh Manis', items: [
      { ingredientId: teh.id, qty: 1, unit: 'pcs' },
      { ingredientId: gula.id, qty: 10, unit: 'gram' },
    ]},
    { productName: 'Es Teh Tawar', items: [
      { ingredientId: teh.id, qty: 1, unit: 'pcs' },
    ]},
  ];

  for (const recipe of recipes) {
    const product = await prisma.product.findFirst({ where: { name: recipe.productName } });
    if (product) {
      for (const item of recipe.items) {
        await prisma.productIngredient.upsert({
          where: { productId_ingredientId: { productId: product.id, ingredientId: item.ingredientId } },
          update: { qty: item.qty, unit: item.unit },
          create: {
            productId: product.id,
            ingredientId: item.ingredientId,
            qty: item.qty,
            unit: item.unit,
          },
        });
      }
    }
  }

  console.log('Recipe seeded');

  // Set initial product stock
  const allProducts = await prisma.product.findMany();
  for (const p of allProducts) {
    await prisma.product.update({
      where: { id: p.id },
      data: { stock: 50 },
    });
  }
  console.log('Product stock initialized to 50');

  // Seed sample members
  const members = [
    { name: 'Budi Santoso', phone: '081234567890', email: 'budi@email.com', points: 250, totalPoints: 350 },
    { name: 'Siti Nurhaliza', phone: '081234567891', email: 'siti@email.com', points: 500, totalPoints: 600 },
    { name: 'Ahmad Rizki', phone: '081234567892', email: null, points: 50, totalPoints: 80 },
  ];

  for (const m of members) {
    await prisma.member.upsert({
      where: { phone: m.phone },
      update: {},
      create: m,
    });
  }
  console.log('Members seeded');

  const memberBudi = await prisma.member.findFirst({ where: { phone: '081234567890' } });
  const memberSiti = await prisma.member.findFirst({ where: { phone: '081234567891' } });
  const ayamKecil = await prisma.product.findFirst({ where: { name: 'Ayam Kecil' } });
  const ayamBesar = await prisma.product.findFirst({ where: { name: 'Ayam Besar' } });
  const nasi = await prisma.product.findFirst({ where: { name: 'Nasi Putih' } });
  const esTeh = await prisma.product.findFirst({ where: { name: 'Es Teh Manis' } });
  const kasir = await prisma.user.findFirst({ where: { email: 'kasir@geprek.com' } });

  // Seed sample transactions
  const sampleTx = [
    {
      invoiceNumber: 'INV-SAMPLE-001',
      memberId: memberBudi.id,
      userId: kasir.id,
      totalAmount: 34000,
      discountPct: 0,
      discountAmount: 0,
      taxPct: 0,
      taxAmount: 0,
      finalAmount: 34000,
      paymentMethod: 'cash',
      pointsEarned: 25,
      items: [
        { productId: ayamKecil.id, qty: 2, price: ayamKecil.price },
        { productId: nasi.id, qty: 1, price: nasi.price },
        { productId: esTeh.id, qty: 1, price: esTeh.price },
      ],
    },
    {
      invoiceNumber: 'INV-SAMPLE-002',
      memberId: memberSiti.id,
      userId: owner.id,
      totalAmount: 43000,
      discountPct: 10,
      discountAmount: 4300,
      taxPct: 0,
      taxAmount: 0,
      finalAmount: 38700,
      paymentMethod: 'qris',
      pointsEarned: 30,
      items: [
        { productId: ayamBesar.id, qty: 1, price: ayamBesar.price },
        { productId: ayamKecil.id, qty: 1, price: ayamKecil.price },
        { productId: nasi.id, qty: 2, price: nasi.price },
      ],
    },
    {
      invoiceNumber: 'INV-SAMPLE-003',
      memberId: null,
      userId: kasir.id,
      totalAmount: 15000,
      discountPct: 0,
      discountAmount: 0,
      taxPct: 11,
      taxAmount: 1650,
      finalAmount: 16650,
      paymentMethod: 'transfer',
      pointsEarned: 0,
      items: [
        { productId: ayamKecil.id, qty: 1, price: ayamKecil.price },
        { productId: esTeh.id, qty: 1, price: esTeh.price },
      ],
    },
  ];

  for (const tx of sampleTx) {
    const created = await prisma.transaction.create({
      data: {
        invoiceNumber: tx.invoiceNumber,
        memberId: tx.memberId,
        userId: tx.userId,
        totalAmount: tx.totalAmount,
        discountPct: tx.discountPct,
        discountAmount: tx.discountAmount,
        taxPct: tx.taxPct,
        taxAmount: tx.taxAmount,
        finalAmount: tx.finalAmount,
        paymentMethod: tx.paymentMethod,
        pointsEarned: tx.pointsEarned,
        items: {
          create: tx.items.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            price: item.price,
          })),
        },
      },
    });

    if (tx.memberId) {
      await prisma.member.update({
        where: { id: tx.memberId },
        data: {
          points: { increment: tx.pointsEarned },
          totalPoints: { increment: tx.pointsEarned },
        },
      });

      await prisma.pointHistory.create({
        data: {
          memberId: tx.memberId,
          transactionId: created.id,
          points: tx.pointsEarned,
          type: 'EARNED',
          description: `Points from transaction ${tx.invoiceNumber}`,
        },
      });
    }
  }
  console.log('Sample transactions seeded');

  // Seed voucher for member Siti (500+ points)
  const existingVoucher = await prisma.voucher.findFirst({ where: { memberId: memberSiti.id } });
  if (!existingVoucher) {
    await prisma.voucher.create({
      data: {
        memberId: memberSiti.id,
        type: 'FREE_AYAM',
        code: 'VCH-FREE-AYAM-001',
        discountPct: null,
        freeItem: 'Ayam 1 pcs',
        pointsCost: 500,
        isUsed: false,
      },
    });
    console.log('Sample voucher seeded for Siti');
  }

  console.log('Seed complete!');
  console.log('---');
  console.log('Owner: owner@geprek.com / admin123');
  console.log('Kasir: kasir@geprek.com / admin123');
  console.log('Sample members: Budi (250pts), Siti (500pts + FREE_AYAM), Ahmad (50pts)');
  console.log('Sample transactions: 3 transaksi');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
