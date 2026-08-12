const prisma = require('../config/database');

exports.getAll = async (req, res) => {
  try {
    const settings = await prisma.appSetting.findMany({ orderBy: { id: 'asc' } });
    const map = {};
    for (const s of settings) map[s.key] = s.value;
    res.json(map);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
};


