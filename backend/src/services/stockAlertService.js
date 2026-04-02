const { AdminNotification, User, SystemConfig } = require("../models");
const emailService = require("./emailService");
const logger = require("../utils/logger");
const stockAlertPolicy = require("../config/stockAlertPolicy");
const {
  getActiveStockIssues,
  buildStockDigestMessage,
} = require("./stockIssueService");

function getISTParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: stockAlertPolicy.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: parseInt(map.hour, 10),
    minute: parseInt(map.minute, 10),
    dateKey: `${map.year}-${map.month}-${map.day}`,
  };
}

function getWindowForNow(hour) {
  return stockAlertPolicy.notificationWindows.find(
    (w) => hour >= w.startHour && hour < w.endHour,
  );
}

async function hasMarker(key) {
  const value = await SystemConfig.get(key);
  return value === "1";
}

async function setMarker(key, description) {
  await SystemConfig.set(key, "1", description);
}

async function checkAndAlert(product) {
  try {
    const stock = parseFloat(product.stock_quantity ?? 0);
    const threshold = parseFloat(product.low_stock_threshold ?? 10);

    // We no longer emit immediate stock notifications/emails.
    // We only resolve stale per-product rows if stock recovered.
    if (stock > threshold) {
      await AdminNotification.resolveForProduct(product.id).catch(() => {});
    }
  } catch (err) {
    logger.error("[stock-alert] checkAndAlert error:", err);
  }
}

async function checkAndAlertMany(productIds, findById) {
  const unique = [...new Set(productIds.filter(Boolean))];
  for (const id of unique) {
    try {
      const product = await findById(id);
      if (product) await checkAndAlert(product);
    } catch (err) {
      logger.error(`[stock-alert] checkAndAlertMany failed for product ${id}:`, err);
    }
  }
}

async function runFullScan() {
  try {
    const issues = await getActiveStockIssues();
    logger.info(`[stock-alert] full scan complete: issues=${issues.length}`);
    return { scanned: issues.length, alerted: issues.length, issues };
  } catch (err) {
    logger.error("[stock-alert] runFullScan error:", err);
    throw err;
  }
}

async function runScheduledDispatch() {
  try {
    const now = getISTParts();
    const issues = await getActiveStockIssues();

    if (!issues.length) {
      logger.info("[stock-alert] scheduled dispatch: no active stock issues");
      return { issues: 0, emailSent: false, notificationSent: false };
    }

    let emailSent = false;
    for (const slot of stockAlertPolicy.emailSlots) {
      if (slot.hour === now.hour && slot.minute === now.minute) {
        const emailKey = `stock_alert_email_${now.dateKey}_${slot.label}`;
        if (!(await hasMarker(emailKey))) {
          const adminEmails = await User.findAdminEmails();
          if (adminEmails.length) {
            const result = await emailService.sendStockDigest(adminEmails, issues, slot.label);
            if (result?.sent > 0) {
              await setMarker(emailKey, `Stock digest email sent for ${slot.label}`);
              emailSent = true;
            }
          }
        }
      }
    }

    let notificationSent = false;
    const window = getWindowForNow(now.hour);
    if (window) {
      const notifKey = `stock_alert_notif_${now.dateKey}_${window.label}`;
      if (!(await hasMarker(notifKey))) {
        await AdminNotification.create({
          type: "stock_digest",
          title: `Stock Alert Summary (${window.label})`,
          message: buildStockDigestMessage(issues),
          productId: null,
          orderId: null,
          stockAtAlert: null,
        });
        await setMarker(notifKey, `Stock digest notification sent for ${window.label}`);
        notificationSent = true;
      }
    }

    return { issues: issues.length, emailSent, notificationSent };
  } catch (err) {
    logger.error("[stock-alert] runScheduledDispatch error:", err);
    return { issues: 0, emailSent: false, notificationSent: false, error: err.message };
  }
}

module.exports = { checkAndAlert, checkAndAlertMany, runFullScan, runScheduledDispatch };
