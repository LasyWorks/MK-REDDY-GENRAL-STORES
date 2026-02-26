const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const FAST2SMS_URL = 'https://www.fast2sms.com/dev/bulkV2';
class SmsService {
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