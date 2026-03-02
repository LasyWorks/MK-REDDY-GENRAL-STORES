const { errorHandler, notFoundHandler, asyncHandler } = require('./errorHandler');
const { authenticate, optionalAuth, authorize, adminOnly, customerOnly, verifyRefreshToken } = require('./auth');
const { apiLimiter, otpLimiter, loginLimiter, uploadLimiter } = require('./rateLimiter');
const requestLogger = require('./requestLogger');
const languageMiddleware = require('./language');
const { uploadExcel, uploadImage, uploadImages } = require('./upload');
const { cacheMiddleware, invalidateCache, cacheStats, clearCache, cache } = require('./cache');

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  authenticate,
  optionalAuth,
  authorize,
  adminOnly,
  customerOnly,
  verifyRefreshToken,
  apiLimiter,
  otpLimiter,
  loginLimiter,
  uploadLimiter,
  requestLogger,
  languageMiddleware,
  uploadExcel,
  uploadImage,
  uploadImages,
  cacheMiddleware,
  invalidateCache,
  cacheStats,
  clearCache,
  cache,
};
