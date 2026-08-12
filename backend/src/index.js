const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const ingredientRoutes = require('./routes/ingredient.routes');
const memberRoutes = require('./routes/member.routes');
const transactionRoutes = require('./routes/transaction.routes');
const expenseRoutes = require('./routes/expense.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const reportRoutes = require('./routes/report.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const auditRoutes = require('./routes/audit.routes');
const voucherRewardRoutes = require('./routes/voucherReward.routes');
const masterRoutes = require('./routes/master.routes');
const settingsRoutes = require('./routes/settings.routes');

function createApp() {
  const app = express();

  app.use(cors({
    origin: true,
  }));
  app.use(helmet());
  app.use(express.json({ limit: '10kb' }));
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many attempts, try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/ingredients', ingredientRoutes);
  app.use('/api/members', memberRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/expenses', expenseRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/voucher-rewards', voucherRewardRoutes);
  app.use('/api/master', masterRoutes);
  app.use('/api/settings', settingsRoutes);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Sales Auto Analytics API Running' });
  });

  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

const app = createApp();

// Jalankan server hanya saat dieksekusi langsung (bukan saat di-import sebagai
// serverless function di Vercel).
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = { createApp, app };
