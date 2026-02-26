/**
 * Security Alerting System
 * Sends real-time alerts for security events
 */

const logger = require('./logger');
const securityConfig = require('../config/security');

/**
 * Send a security alert
 * @param {string} eventType - Type of security event
 * @param {Object} details - Event details
 */
async function sendSecurityAlert(eventType, details) {
  if (!securityConfig.alerts.enabled) return;
  
  if (!securityConfig.alerts.events.includes(eventType)) return;

  const alert = {
    timestamp: new Date().toISOString(),
    event: eventType,
    details,
    severity: getSeverity(eventType),
  };

  // Log alert
  if (securityConfig.alerts.channels.includes('log')) {
    logger.warn(`🚨 SECURITY ALERT [${eventType}]:`, alert);
  }

  // Send email alert (implement if needed)
  if (securityConfig.alerts.channels.includes('email')) {
    // await sendEmailAlert(alert);
  }

  // Send Slack alert (implement if needed)
  if (securityConfig.alerts.channels.includes('slack')) {
    // await sendSlackAlert(alert);
  }

  // Send webhook alert (implement if needed)
  if (securityConfig.alerts.channels.includes('webhook')) {
    // await sendWebhookAlert(alert);
  }
}

function getSeverity(eventType) {
  const highSeverity = [
    'SQL_INJECTION_ATTEMPT',
    'XSS_ATTEMPT',
    'ROLE_CHANGE',
    'ADMIN_PASSWORD_CHANGE',
    'DATA_EXPORT',
  ];

  const mediumSeverity = [
    'ACCOUNT_LOCKED',
    'MULTIPLE_FAILED_LOGINS',
    'RATE_LIMIT_EXCEEDED',
  ];

  if (highSeverity.includes(eventType)) return 'HIGH';
  if (mediumSeverity.includes(eventType)) return 'MEDIUM';
  return 'LOW';
}

module.exports = {
  sendSecurityAlert,
};
