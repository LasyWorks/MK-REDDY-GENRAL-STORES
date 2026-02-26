const crypto = require('crypto');
const { v7: uuidv7 } = require('uuid');
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  // Use crypto.randomInt for cryptographically secure randomness (not Math.random)
  for (let i = 0; i < length; i++) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }
  return otp;
};
const hashOTP = (otp) => {
  // Hash OTP before storing to protect users if database is compromised
  return crypto.createHash('sha256').update(otp).digest('hex');
};
const generateInvoiceNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const uniquePart = crypto.randomInt(10000, 99999);
  return `INV-${dateStr}-${uniquePart}`;
};
const generateOrderNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const uniquePart = crypto.randomInt(10000, 99999);
  return `ORD-${dateStr}-${uniquePart}`;
};
const generateUUID = () => {
  return uuidv7();
};
const sanitizePhone = (phone) => {
  if (!phone) return '';
  return phone.replace(/[^\d+]/g, '');
};
const formatPhone = (phone) => {
  const sanitized = sanitizePhone(phone);
  if (sanitized.length === 10) {
    return `+91-${sanitized.slice(0, 5)}-${sanitized.slice(5)}`;
  }
  return sanitized;
};
const calculateGST = (amount, gstPercentage) => {
  const gstAmount = (amount * gstPercentage) / 100;
  // Split GST equally between CGST and SGST (Indian tax structure)
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
const getPaginationParams = (page = 1, limit = 10, maxLimit = 100) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const requestedLimit = parseInt(limit, 10) || 10;
  const limitNum = Math.min(maxLimit, Math.max(1, requestedLimit));
  const offset = (pageNum - 1) * limitNum;
  // Warn if client requests too much data - helps catch bugs and potential DoS attempts
  if (requestedLimit > maxLimit) {
    console.warn(`Requested limit ${requestedLimit} exceeds max limit ${maxLimit}. Using ${maxLimit}.`);
  }
  return {
    page: pageNum,
    limit: limitNum,
    offset,
  };
};
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
/**
 * Auto-generate a SKU from product attributes.
 * Format: {BRAND}-{NAME}-{VARIANT}-{SEQ}  (slugified, upper-case, max ~50 chars)
 * If brand/variant are absent the segments are skipped.
 * @param {{ name_en?: string, brand?: string, variant?: string }} data
 * @param {number} [seq] - optional sequence / counter to append
 * @returns {string} Generated SKU
 */
const generateSku = (data = {}, seq) => {
  const parts = [data.brand, data.name_en, data.variant].filter(Boolean);
  let slug = parts
    .join('-')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 45);
  // Append a short random suffix to guarantee uniqueness
  const suffix = seq != null
    ? String(seq)
    : crypto.randomInt(10000, 99999).toString();
  return `${slug}-${suffix}`;
};
// ── Role resolver (cached) ──────────────────────────────────────────
let _roleCache = null;
/**
 * Get role UUID by role name. Caches all roles on first call.
 * @param {string} roleName - e.g. 'admin', 'retail_customer', 'wholesale_customer'
 * @returns {Promise<string>} UUID of the role
 */
const getRoleId = async (roleName) => {
  if (!_roleCache) {
    const { query } = require('../config/database');
    const rows = await query('SELECT id, name FROM roles');
    _roleCache = {};
    for (const row of rows) _roleCache[row.name] = row.id;
  }
  const id = _roleCache[roleName];
  if (!id) throw new Error(`Role '${roleName}' not found`);
  return id;
};
/**
 * Map user_type to role name, then resolve UUID.
 * @param {string} userType - 'admin' | 'retail' | 'wholesale'
 * @returns {Promise<string>} UUID of the corresponding role
 */
const getRoleIdByUserType = async (userType) => {
  const map = { admin: 'admin', retail: 'retail_customer', wholesale: 'wholesale_customer' };
  return getRoleId(map[userType] || 'retail_customer');
};
/** Reset cached roles (useful after migration / tests) */
const resetRoleCache = () => { _roleCache = null; };
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
  generateSku,
  getRoleId,
  getRoleIdByUserType,
  resetRoleCache,
};
