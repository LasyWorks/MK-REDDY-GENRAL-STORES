const express = require('express');
const router = express.Router();
const os = require('os');
const path = require('path');
const { pool } = require('../config/database');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const categoryRoutes = require('./categoryRoutes');
const productRoutes = require('./productRoutes');
const cartRoutes = require('./cartRoutes');
const orderRoutes = require('./orderRoutes');
const invoiceRoutes = require('./invoiceRoutes');
const adminRoutes = require('./adminRoutes');
const promotionRoutes = require('./promotionRoutes');
router.get('/health', async (req, res) => {
  const startAt = process.hrtime.bigint();
  const checks = { database: 'unknown' };
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }
  const latencyMs = Number(process.hrtime.bigint() - startAt) / 1e6;
  const allOk = Object.values(checks).every(v => v === 'ok');
  res.status(allOk ? 200 : 503).json({
    success: allOk,
    status: allOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    uptime: {
      processSeconds: Math.floor(process.uptime()),
      systemSeconds: Math.floor(os.uptime()),
    },
    latencyMs: parseFloat(latencyMs.toFixed(2)),
    checks,
    memory: {
      heapUsedMB: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1),
      heapTotalMB: (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(1),
      rssMB: (process.memoryUsage().rss / 1024 / 1024).toFixed(1),
    },
    database: {
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingClients: pool.waitingCount,
    },
    node: process.version,
  });
});
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to MK Kirana Stores API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      categories: '/api/v1/categories',
      products: '/api/v1/products',
      cart: '/api/v1/cart',
      orders: '/api/v1/orders',
      invoices: '/api/v1/invoices',
      admin: '/api/v1/admin',
    },
    documentation: '/api/v1/docs',
    pagination: {
      default_limit: 10,
      max_limit: 100,
      usage: '?page=1&limit=20',
      note: 'All list endpoints support pagination',
    },
  });
});
router.get('/docs', (req, res) => {
  const docsPath = path.join(__dirname, '../../tests/API-REFERENCE.html');
  res.sendFile(docsPath);
});
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/admin', adminRoutes);
router.use('/promotions', promotionRoutes);
module.exports = router;