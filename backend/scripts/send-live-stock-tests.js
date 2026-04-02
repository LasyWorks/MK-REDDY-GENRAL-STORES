const { User, AdminNotification } = require('../src/models');
const emailService = require('../src/services/emailService');
const {
  getActiveStockIssues,
  summarizeStockIssues,
  buildStockDigestMessage,
} = require('../src/services/stockIssueService');

(async () => {
  const issues = await getActiveStockIssues();
  const summary = summarizeStockIssues(issues);
  const adminEmails = await User.findAdminEmails();

  const result = {
    issues: summary,
    adminEmails,
    digestEmail: null,
    productAlertEmails: [],
    digestNotificationId: null,
  };

  if (issues.length > 0) {
    const message = buildStockDigestMessage(issues);
    const notification = await AdminNotification.create({
      type: 'stock_digest',
      title: 'Stock Alert Summary (manual-live-test)',
      message,
      productId: null,
      orderId: null,
      stockAtAlert: null,
    });
    result.digestNotificationId = notification.id;
  }

  if (adminEmails.length > 0 && issues.length > 0) {
    result.digestEmail = await emailService.sendStockDigest(adminEmails, issues, 'manual-live-test');

    const outIssue = issues.find((i) => i.alertType === 'out');
    const lowIssue = issues.find((i) => i.alertType === 'low');

    if (outIssue) {
      const outRes = await emailService.sendStockAlert(adminEmails, outIssue, 'out');
      result.productAlertEmails.push({ type: 'out', product: outIssue.name, res: outRes });
    }

    if (lowIssue) {
      const lowRes = await emailService.sendStockAlert(adminEmails, lowIssue, 'low');
      result.productAlertEmails.push({ type: 'low', product: lowIssue.name, res: lowRes });
    }
  }

  console.log(JSON.stringify(result, null, 2));
})().catch((err) => {
  console.error('FAILED_SEND_LIVE_STOCK_TESTS');
  console.error(err);
  process.exit(1);
});
