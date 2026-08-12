const prisma = require('../config/database');

exports.getAll = async (req, res) => {
  try {
    const rewards = await prisma.voucherReward.findMany({ orderBy: { pointsCost: 'asc' } });
    res.json(rewards);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, discountPct, pointsCost, freeItem } = req.body;
    if (!name || pointsCost == null) return res.status(400).json({ error: 'Nama dan pointsCost wajib diisi' });
    const reward = await prisma.voucherReward.create({
      data: { name, discountPct: discountPct || null, pointsCost, freeItem: freeItem || null },
    });
    res.status(201).json(reward);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, discountPct, pointsCost, freeItem, isActive } = req.body;
    const reward = await prisma.voucherReward.update({
      where: { id: parseInt(id) },
      data: { name, discountPct, pointsCost, freeItem, isActive },
    });
    res.json(reward);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.voucherReward.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });
    res.json({ message: 'Voucher reward dinonaktifkan' });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};

exports.hardDelete = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.voucherReward.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Voucher reward dihapus permanen' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Reward tidak ditemukan' });
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};


