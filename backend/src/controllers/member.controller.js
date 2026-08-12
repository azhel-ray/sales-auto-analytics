const prisma = require('../config/database');

exports.getAll = async (req, res) => {
  try {
    const members = await prisma.member.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { transactions: true } } },
    });
    res.json(members);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.search = async (req, res) => {
  try {
    const { phone } = req.query;
    const member = await prisma.member.findUnique({
      where: { phone },
      include: { vouchers: { where: { isUsed: false } }, _count: { select: { transactions: true } } },
    });
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json(member);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        vouchers: { orderBy: { createdAt: 'desc' }, include: { reward: true } },
        pointHistories: { orderBy: { createdAt: 'desc' }, take: 50 },
        _count: { select: { transactions: true } },
      },
    });
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json(member);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    const existing = await prisma.member.findUnique({ where: { phone } });
    if (existing) return res.status(400).json({ error: 'Phone number already registered' });

    const member = await prisma.member.create({ data: { name, phone, email } });
    res.status(201).json(member);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, email } = req.body;
    const member = await prisma.member.update({
      where: { id: parseInt(req.params.id) },
      data: { ...(name && { name }), ...(email && { email }) },
    });
    res.json(member);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.delete = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const member = await prisma.member.findUnique({ where: { id } });
    if (!member) return res.status(404).json({ error: 'Member not found' });

    await prisma.$transaction(async (tx) => {
      await tx.transaction.updateMany({
        where: { memberId: id },
        data: { memberId: null },
      });
      const voucherIds = (await tx.voucher.findMany({
        where: { memberId: id },
        select: { id: true },
      })).map(v => v.id);
      if (voucherIds.length > 0) {
        await tx.transaction.updateMany({
          where: { voucherId: { in: voucherIds } },
          data: { voucherId: null },
        });
        await tx.voucherUsage.deleteMany({
          where: { voucherId: { in: voucherIds } },
        });
      }
      await tx.member.delete({ where: { id } });
    });

    res.json({ message: 'Member berhasil dihapus' });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};


