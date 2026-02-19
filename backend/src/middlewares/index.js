const { errorHandler, notFoundHandler, asyncHandler } = require('./errorHandler');
const { authenticate, optionalAuth, authorize, adminOnly, customerOnly, verifyRefreshToken } = require('./auth');
const { apiLimiter, otpLimiter, loginLimiter, uploadLimiter } = require('./rateLimiter');
const requestLogger = require('./requestLogger');
const languageMiddleware = require('./language');
const { uploadExcel, uploadImage, uploadImages } = require('./upload');

module.exports = {
  // Error handling
  errorHandler,
  notFoundHandler,
  asyncHandler,

  // Authentication & Authorization
  authenticate,
  optionalAuth,
  authorize,
  adminOnly,
  customerOnly,
  verifyRefreshToken,

  // Rate limiting
  apiLimiter,
  otpLimiter,
  loginLimiter,
  uploadLimiter,

  // Logging
  requestLogger,

  // Language
  languageMiddleware,

  // File uploads
  uploadExcel,
  uploadImage,
  uploadImages,
};
