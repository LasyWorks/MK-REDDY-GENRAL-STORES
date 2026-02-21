const rateLimit = require('express-rate-limit');
const config = require('../config');
const ApiError = require('../utils/ApiError');

// In development, bypass rate limiting to allow testing
const isDev = process.env.NODE_ENV === 'development';

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // 15 minutes
  max: isDev ? 10000 : config.rateLimit.maxRequests, // unlimited in dev
  message: {
    success: false,
    status: 'fail',
    message: 'Too many requests, please try again later.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    throw ApiError.tooManyRequests(options.message.message);
  },
});

/**
 * OTP rate limiter - stricter limits
 */
const otpLimiter = rateLimit({
  windowMs: config.rateLimit.otpWindowMs, // 1 minute
  max: isDev ? 10000 : config.rateLimit.otpMaxRequests, // unlimited in dev
  message: {
    success: false,
    status: 'fail',
    message: 'Too many OTP requests. Please wait before requesting again.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by phone number if provided, otherwise by IP
    return req.body.phone || req.ip;
  },
  handler: (req, res, next, options) => {
    throw ApiError.tooManyRequests(options.message.message);
  },
});

/**
 * Login rate limiter
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Increase allowed login attempts for testing (100)
  message: {
    success: false,
    status: 'fail',
    message: 'Too many login attempts. Please try again after 15 minutes.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.body.phone || req.body.email || req.ip;
  },
  handler: (req, res, next, options) => {
    throw ApiError.tooManyRequests(options.message.message);
  },
});

/**
 * Bulk upload rate limiter
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: {
    success: false,
    status: 'fail',
    message: 'Too many upload attempts. Please try again later.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    throw ApiError.tooManyRequests(options.message.message);
  },
});

module.exports = {
  apiLimiter,
  otpLimiter,
  loginLimiter,
  uploadLimiter,
};
