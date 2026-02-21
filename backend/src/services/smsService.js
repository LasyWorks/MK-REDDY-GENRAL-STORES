const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

/* ── Fast2SMS integration ────────────────────────────────────── */

const FAST2SMS_URL = 'https://www.fast2sms.com/dev/bulkV2';

class SmsService {
  /**
   * Send a text message via Fast2SMS
   * @param {string} phone  - 10-digit Indian mobile number
   * @param {string} message - Plain-text message body
   */
  static async sendMessage(phone, message) {
    if (config.env === 'development') {
      logger.info(`[SMS-DEV] To: ${phone} | ${message}`);
      return { success: true, dev: true };
    }

    try {
      const { data } = await axios.post(
        FAST2SMS_URL,
        {
          sender_id:    config.fast2sms.senderId,
          message,
          language:     'english',
          route:        config.fast2sms.route || 'q', // 'q' = quick transactional
          numbers:      phone,
        },
        {
          headers: {
            authorization: config.fast2sms.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 8000,
        }
      );

      if (!data.return) {
        throw new Error(data.message || 'Fast2SMS rejected the request');
      }

      logger.info(`SMS sent to ${phone}`);
      return { success: true, requestId: data.request_id };
    } catch (err) {
      logger.error(`SMS failed to ${phone}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Send OTP via Fast2SMS OTP route (variables_values inserts into template)
   * @param {string} phone
   * @param {string} otp   - Numeric OTP string
   */
  static async sendOtp(phone, otp) {
    if (config.env === 'development') {
      logger.info(`[OTP-DEV] To: ${phone} | OTP: ${otp}`);
      return { success: true, dev: true, otp };
    }

    try {
      const { data } = await axios.post(
        FAST2SMS_URL,
        {
          variables_values: otp,
          route:            'otp',
          numbers:          phone,
        },
        {
          headers: {
            authorization: config.fast2sms.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 8000,
        }
      );

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
