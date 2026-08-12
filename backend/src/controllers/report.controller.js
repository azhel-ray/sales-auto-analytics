const prisma = require('../config/database');
const { calculateProfitLoss } = require('../utils/calculator');

exports.exportPdf = async (req, res) => {
  try {
    const PdfPrinter = require('pdfmake');
    const vfsFonts = require('pdfmake/build/vfs_fonts');
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const pl = await calculateProfitLoss(start, end);
    const taxSetting = await prisma.appSetting.findUnique({ where: { key: 'tax_rate' } });
    const taxRate = taxSetting?.value || '11';
    const transactions = await prisma.transaction.findMany({
      where: { createdAt: { gte: start, lte: end }, status: 'ACTIVE' },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const ingredientMutations = await prisma.inventoryMutation.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { ingredient: { select: { id: true, name: true, unit: true, stock: true } } },
    });

    const ingredientFlow = {};
    for (const m of ingredientMutations) {
      if (!ingredientFlow[m.ingredientId]) {
        ingredientFlow[m.ingredientId] = { name: m.ingredient.name, unit: m.ingredient.unit, stock: m.ingredient.stock, in: 0, out: 0 };
      }
      if (m.type === 'IN') ingredientFlow[m.ingredientId].in += m.qty;
      if (m.type === 'OUT') ingredientFlow[m.ingredientId].out += m.qty;
    }

    const productions = await prisma.production.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { product: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const productionSummary = {};
    for (const p of productions) {
      if (!productionSummary[p.productId]) productionSummary[p.productId] = { name: p.product.name, qty: 0 };
      productionSummary[p.productId].qty += p.qty;
    }

    const fonts = {
      Roboto: {
        normal: Buffer.from(vfsFonts['Roboto-Regular.ttf'], 'base64'),
        bold: Buffer.from(vfsFonts['Roboto-Medium.ttf'], 'base64'),
        italics: Buffer.from(vfsFonts['Roboto-Italic.ttf'], 'base64'),
        bolditalics: Buffer.from(vfsFonts['Roboto-MediumItalic.ttf'], 'base64'),
      },
    };

    const printer = new PdfPrinter(fonts);

    const content = [
      { text: 'SALES AUTO ANALYTICS', style: 'header' },
      { text: `Report Period: ${start.toLocaleDateString('id-ID')} - ${end.toLocaleDateString('id-ID')}`, style: 'subheader' },
      { text: '\n' },
      { text: 'Profit & Loss Summary', style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          body: [
            ['Metric', 'Value'],
            ['Total Revenue (excl. PPN)', `Rp ${pl.totalRevenue.toLocaleString('id-ID')}`],
              ...(pl.totalTax > 0 ? [['PPN ' + taxRate + '%', `Rp ${pl.totalTax.toLocaleString('id-ID')}`]] : []),
              ['COGS (Harga Pokok)', `Rp ${pl.totalCogs.toLocaleString('id-ID')}`],
              ...(pl.totalVoucherCogs > 0 ? [['Voucher Loss (Gratis Ayam)', `Rp ${pl.totalVoucherCogs.toLocaleString('id-ID')}`]] : []),
              ['Total Expenses', `Rp ${pl.totalExpenses.toLocaleString('id-ID')}`],
              ['Total Cost', `Rp ${pl.totalCost.toLocaleString('id-ID')}`],
              ['Profit', `Rp ${pl.profit.toLocaleString('id-ID')}`],
              ['Status', pl.status],
              ['Profit %', `${pl.profitPercentage}%`],
          ],
        },
      },
      { text: '\n' },
      { text: 'Transaction List', style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          body: [
            ['Invoice', 'Total', 'Discount', 'Final', 'Date'],
            ...transactions.map((t) => [
              t.invoiceNumber,
              `Rp ${t.totalAmount.toLocaleString('id-ID')}`,
              `Rp ${t.discountAmount.toLocaleString('id-ID')}`,
              `Rp ${t.finalAmount.toLocaleString('id-ID')}`,
              new Date(t.createdAt).toLocaleDateString('id-ID'),
            ]),
            ['', '', '', '', ''],
            [{ text: 'TOTAL', bold: true, colSpan: 3, alignment: 'right', fontSize: 11 }, {}, {}, { text: `Rp ${pl.totalRevenue.toLocaleString('id-ID')}`, bold: true, alignment: 'right' }, ''],
          ],
        },
      },
      { text: '\n' },
      { text: 'Bahan Baku — Pergerakan Stok', style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          body: [
            ['Bahan', 'Satuan', 'Masuk', 'Keluar', 'Stok Akhir'],
            ...Object.values(ingredientFlow).map((i) => [
              i.name, i.unit, i.in, i.out, i.stock,
            ]),
            ...(Object.keys(ingredientFlow).length === 0 ? [['Tidak ada pergerakan bahan baku di periode ini', '', '', '', '']] : []),
          ],
        },
      },
    ];

    if (Object.keys(productionSummary).length > 0) {
      content.push({ text: '\n' }, { text: 'Produksi', style: 'sectionHeader' });
      content.push({
        table: {
          headerRows: 1,
          body: [
            ['Produk', 'Jumlah Diproduksi'],
            ...Object.values(productionSummary).map((p) => [p.name, p.qty]),
          ],
        },
      });
    }

    const docDefinition = { content, styles: {
      header: { fontSize: 18, bold: true, alignment: 'center', margin: [0, 0, 0, 10] },
      subheader: { fontSize: 12, alignment: 'center', margin: [0, 0, 0, 20] },
      sectionHeader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
    } };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks = [];
    pdfDoc.on('data', (chunk) => chunks.push(chunk));
    pdfDoc.on('end', () => {
      const result = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=report-${start.toISOString().split('T')[0]}.pdf`);
      res.send(result);
    });
    pdfDoc.end();
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.exportExcel = async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const pl = await calculateProfitLoss(start, end);
    const taxSetting2 = await prisma.appSetting.findUnique({ where: { key: 'tax_rate' } });
    const taxRate2 = taxSetting2?.value || '11';
    const transactions = await prisma.transaction.findMany({
      where: { createdAt: { gte: start, lte: end }, status: 'ACTIVE' },
      include: { items: { include: { product: true } }, member: true },
      orderBy: { createdAt: 'desc' },
    });

    const ingredientMutations = await prisma.inventoryMutation.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { ingredient: { select: { id: true, name: true, unit: true, stock: true } } },
    });

    const ingredientFlow = {};
    for (const m of ingredientMutations) {
      if (!ingredientFlow[m.ingredientId]) {
        ingredientFlow[m.ingredientId] = { name: m.ingredient.name, unit: m.ingredient.unit, stock: m.ingredient.stock, in: 0, out: 0 };
      }
      if (m.type === 'IN') ingredientFlow[m.ingredientId].in += m.qty;
      if (m.type === 'OUT') ingredientFlow[m.ingredientId].out += m.qty;
    }

    const productions = await prisma.production.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { product: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const productionSummary = {};
    for (const p of productions) {
      if (!productionSummary[p.productId]) productionSummary[p.productId] = { name: p.product.name, qty: 0 };
      productionSummary[p.productId].qty += p.qty;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Report');

    sheet.columns = [
      { header: 'Invoice', key: 'invoice', width: 20 },
      { header: 'Member', key: 'member', width: 20 },
      { header: 'Total', key: 'total', width: 15 },
      { header: 'Discount', key: 'discount', width: 15 },
      { header: 'Final', key: 'final', width: 15 },
      { header: 'Date', key: 'date', width: 15 },
    ];

    sheet.addRow({});
    sheet.addRow({ invoice: 'PROFIT & LOSS SUMMARY' });
    sheet.addRow({ invoice: 'Total Revenue (excl. PPN)', total: pl.totalRevenue });
    if (pl.totalTax > 0) sheet.addRow({ invoice: 'PPN ' + taxRate2 + '%', total: pl.totalTax });
    sheet.addRow({ invoice: 'COGS (Harga Pokok)', total: pl.totalCogs });
    if (pl.totalVoucherCogs > 0) sheet.addRow({ invoice: 'Voucher Loss (Gratis Ayam)', total: pl.totalVoucherCogs });
    sheet.addRow({ invoice: 'Total Expenses', total: pl.totalExpenses });
    sheet.addRow({ invoice: 'Total Cost', total: pl.totalCost });
    sheet.addRow({ invoice: 'Profit', total: pl.profit });
    sheet.addRow({ invoice: 'Status', total: pl.status });
    sheet.addRow({});

    sheet.addRow({ invoice: 'TRANSACTION LIST' });

    for (const t of transactions) {
      sheet.addRow({
        invoice: t.invoiceNumber,
        member: t.member?.name || '-',
        total: t.totalAmount,
        discount: t.discountAmount,
        final: t.finalAmount,
        date: new Date(t.createdAt).toLocaleDateString('id-ID'),
      });
    }
    sheet.addRow({});
    sheet.addRow({ invoice: 'TOTAL', total: '', discount: '', final: pl.totalRevenue, date: '' });
    sheet.addRow({});
    sheet.addRow({ invoice: 'BAHAN BAKU — PERGERAKAN STOK' });
    sheet.addRow({ invoice: 'Bahan', member: 'Satuan', total: 'Masuk', discount: 'Keluar', final: 'Stok Akhir' });
    for (const i of Object.values(ingredientFlow)) {
      sheet.addRow({ invoice: i.name, member: i.unit, total: i.in, discount: i.out, final: i.stock });
    }
    if (Object.keys(ingredientFlow).length === 0) {
      sheet.addRow({ invoice: 'Tidak ada pergerakan bahan baku di periode ini' });
    }

    if (Object.keys(productionSummary).length > 0) {
      sheet.addRow({});
      sheet.addRow({ invoice: 'PRODUKSI' });
      sheet.addRow({ invoice: 'Produk', member: 'Jumlah Diproduksi' });
      for (const p of Object.values(productionSummary)) {
        sheet.addRow({ invoice: p.name, member: p.qty });
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=report-${start.toISOString().split('T')[0]}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};
