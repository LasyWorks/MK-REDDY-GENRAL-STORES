const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate a random OTP
 * @param {number} length - OTP length (default: 6)
 * @returns {string} Generated OTP
 */
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }
  return otp;
};

/**
 * Hash OTP for secure storage
 * @param {string} otp - Plain OTP
 * @returns {string} Hashed OTP
 */
const hashOTP = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

/**
 * Generate unique invoice number
 * Format: INV-YYYYMMDD-XXXXX
 * @returns {string} Invoice number
 */
const generateInvoiceNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const uniquePart = crypto.randomInt(10000, 99999);
  return `INV-${dateStr}-${uniquePart}`;
};

/**
 * Generate unique order number
 * Format: ORD-YYYYMMDD-XXXXX
 * @returns {string} Order number
 */
const generateOrderNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const uniquePart = crypto.randomInt(10000, 99999);
  return `ORD-${dateStr}-${uniquePart}`;
};

/**
 * Generate UUID
 * @returns {string} UUID
 */
const generateUUID = () => {
  return uuidv4();
};

/**
 * Sanitize phone number
 * @param {string} phone - Phone number
 * @returns {string} Sanitized phone number
 */
const sanitizePhone = (phone) => {
  if (!phone) return '';
  // Remove all non-digit characters except +
  return phone.replace(/[^\d+]/g, '');
};

/**
 * Format phone number for display
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
const formatPhone = (phone) => {
  const sanitized = sanitizePhone(phone);
  if (sanitized.length === 10) {
    return `+91-${sanitized.slice(0, 5)}-${sanitized.slice(5)}`;
  }
  return sanitized;
};

/**
 * Calculate GST amount
 * @param {number} amount - Base amount
 * @param {number} gstPercentage - GST percentage
 * @returns {Object} GST breakdown
 */
const calculateGST = (amount, gstPercentage) => {
  const gstAmount = (amount * gstPercentage) / 100;
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;
  
  return {
    baseAmount: parseFloat(amount.toFixed(2)),
    gstPercentage,
    cgst: parseFloat(cgst.toFixed(2)),
    sgst: parseFloat(sgst.toFixed(2)),
    totalGst: parseFloat(gstAmount.toFixed(2)),
    totalAmount: parseFloat((amount + gstAmount).toFixed(2)),
  };
};

/**
 * Pagination helper
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Pagination params
 */
const getPaginationParams = (page = 1, limit = 10) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;
  
  return {
    page: pageNum,
    limit: limitNum,
    offset,
  };
};

/**
 * Escape HTML to prevent XSS
 * @param {string} str - Input string
 * @returns {string} Escaped string
 */
const escapeHtml = (str) => {
  if (!str) return '';
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return str.replace(/[&<>"'/]/g, (char) => htmlEscapes[char]);
};

/**
 * Truncate string
 * @param {string} str - Input string
 * @param {number} length - Max length
 * @returns {string} Truncated string
 */
const truncate = (str, length = 100) => {
  if (!str || str.length <= length) return str;
  return `${str.substring(0, length)}...`;
};

/**
 * Get multilingual field based on language
 * @param {Object} obj - Object with multilingual fields
 * @param {string} field - Base field name
 * @param {string} lang - Language code
 * @returns {string} Localized value
 */
const getLocalizedField = (obj, field, lang = 'en') => {
  const langField = `${field}_${lang}`;
  const defaultField = `${field}_en`;
  return obj[langField] || obj[defaultField] || obj[field] || '';
};

module.exports = {
  generateOTP,
  hashOTP,
  generateInvoiceNumber,
  generateOrderNumber,
  generateUUID,
  sanitizePhone,
  formatPhone,
  calculateGST,
  getPaginationParams,
  escapeHtml,
  truncate,
  getLocalizedField,
};
