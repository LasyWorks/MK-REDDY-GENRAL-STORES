const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const { getNotifications, markRead, markAllRead, testEmail, forceResend, scanStockAlerts, cleanupDone, clearAll } = require('../controllers/notificationController');

router.use(authenticate, authorize('admin'));

router.get('/', getNotifications);
router.get('/test-email', testEmail);
router.post('/scan-stock-alerts', scanStockAlerts);
router.patch('/force-resend', forceResend);
router.patch('/cleanup-done', cleanupDone);
router.delete('/all', clearAll);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);

module.exports = router;
