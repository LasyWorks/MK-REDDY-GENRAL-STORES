const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

/* ── Fast2SMS DLT integration ────────────────────────────────── */
// Uses GET with query params as per Fast2SMS bulkV2 DLT route:
// GET https://www.fast2sms.com/dev/bulkV2?authorization=KEY&route=dlt
//   &sender_id=SENDER&message=TEMPLATE_ID&variables_values=OTP&numbers=PHONE&flash=0

const FAST2SMS_URL = 'https://www.fast2sms.com/dev/bulkV2';

class SmsService {
  /**
   * Low-level GET request to Fast2SMS DLT route
   * @private
   */
  static async _request(params) {
    const { data } = await axios.get(FAST2SMS_URL, {
      params: {
        authorization:    config.fast2sms.apiKey,
        route:            config.fast2sms.route || 'dlt',
        sender_id:        config.fast2sms.senderId,
        flash:            '0',
        ...params,
      },
      timeout: 8000,
    });
    if (!data.return) {
      throw new Error(data.message || 'Fast2SMS rejected the request');
    }
    return data;
  }

  /**
   * Send a DLT transactional message
   * @param {string} phone    - 10-digit Indian mobile number
   * @param {string} message  - DLT approved template ID
   * @param {string} variables_values - Pipe-separated values for template variables
   */
  static async sendMessage(phone, message, variables_values = '') {
    if (config.env === 'development') {
      logger.info(`[SMS-DEV] To: ${phone} | template: ${message} | vars: ${variables_values}`);
      return { success: true, dev: true };
    }

    try {
      const data = await SmsService._request({ message, variables_values, numbers: phone });
      logger.info(`SMS sent to ${phone} | request_id: ${data.request_id}`);
      return { success: true, requestId: data.request_id };
    } catch (err) {
      logger.error(`SMS failed to ${phone}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Send OTP via Fast2SMS DLT route.
   * The OTP value is passed as variables_values and substituted into the
   * DLT-approved template (FAST2SMS_MESSAGE_ID).
   * @param {string} phone
   * @param {string} otp   - Numeric OTP string
   */
  static async sendOtp(phone, otp) {
    if (config.env === 'development') {
      logger.info(`[OTP-DEV] To: ${phone} | OTP: ${otp}`);
      return { success: true, dev: true, otp };
    }

    try {
      const data = await SmsService._request({
        message:          config.fast2sms.messageId,
        variables_values: otp,
        numbers:          phone,
      });

      if (!data.return) {
        throw new Error(data.message || 'Fast2SMS OTP rejected');
      }

      logger.info(`OTP SMS sent to ${phone}`);
      return { success: true, requestId: data.request_id };
    } catch (err) {
      logger.error(`OTP SMS failed to ${phone}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}

module.exports = SmsService;
