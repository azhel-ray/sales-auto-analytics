const prisma = require('../config/database');

exports.log = async (userId, action, entity, entityId, details) => {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entity, entityId, details: details || {} },
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }
};

exports.getAll = async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(logs);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};