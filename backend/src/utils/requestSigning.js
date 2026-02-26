/**
 * Request signing utilities for securing API communication
 * Uses HMAC-SHA256 for cryptographic signing
 */

const crypto = require('crypto');

/**
 * Generate HMAC-SHA256 signature for request data
 * @param {Object} data - Request payload to sign
 * @param {string} secret - Secret key for signing
 * @param {number} timestamp - Unix timestamp for request validity
 * @returns {string} Hexadecimal HMAC signature
 */
function generateSignature(data, secret, timestamp) {
  const payload = JSON.stringify({
    data,
    timestamp,
  });
  
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Verify HMAC signature for incoming request
 * @param {Object} data - Request payload to verify
 * @param {string} signature - Signature from request header
 * @param {string} secret - Secret key for verification
 * @param {number} timestamp - Unix timestamp from request
 * @param {number} maxAgeSeconds - Maximum age of request in seconds (default: 300 = 5 minutes)
 * @returns {boolean} True if signature is valid and request is not expired
 */
function verifySignature(data, signature, secret, timestamp, maxAgeSeconds = 300) {
  // Check if timestamp is valid and not expired
  const now = Math.floor(Date.now() / 1000);
  const age = now - timestamp;
  
  // Reject requests with future timestamps or expired requests
  if (age < 0 || age > maxAgeSeconds) {
    return false;
  }
  
  // Generate expected signature
  const expectedSignature = generateSignature(data, secret, timestamp);
  
  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    // timingSafeEqual throws if buffers have different lengths
    return false;
  }
}

/**
 * Create signed request headers
 * @param {Object} data - Request payload
 * @param {string} secret - Secret key for signing
 * @returns {Object} Headers object with signature and timestamp
 */
function createSignedHeaders(data, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = generateSignature(data, secret, timestamp);
  
  return {
    'X-Signature': signature,
    'X-Timestamp': timestamp.toString(),
  };
}

/**
 * Express middleware to verify signed requests
 * @param {string} secret - Secret key for verification
 * @param {number} maxAgeSeconds - Maximum age of request in seconds
 * @returns {Function} Express middleware function
 */
function verifySignedRequest(secret, maxAgeSeconds = 300) {
  return (req, res, next) => {
    const signature = req.headers['x-signature'];
    const timestamp = parseInt(req.headers['x-timestamp'], 10);
    
    if (!signature || !timestamp) {
      return res.status(401).json({
        success: false,
        message: 'Missing request signature or timestamp',
      });
    }
    
    const isValid = verifySignature(req.body, signature, secret, timestamp, maxAgeSeconds);
    
    if (!isValid) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired request signature',
      });
    }
    
    next();
  };
}

module.exports = {
  generateSignature,
  verifySignature,
  createSignedHeaders,
  verifySignedRequest,
};
