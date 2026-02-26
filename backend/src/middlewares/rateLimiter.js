const rateLimit = require('express-rate-limit');
const config = require('../config');
const ApiError = require('../utils/ApiError');

const isDev = process.env.NODE_ENV === 'development';

const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, 
  max: isDev ? 5000 : config.rateLimit.maxRequests, 
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
const otpLimiter = rateLimit({
  windowMs: config.rateLimit.otpWindowMs, 
  max: isDev ? 500 : config.rateLimit.otpMaxRequests, 
  message: {
    success: false,
    status: 'fail',
    message: 'Too many OTP requests. Please wait before requesting again.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Track OTP requests by phone number to prevent abuse of specific numbers
    return req.body.phone || req.ip;
  },
  handler: (req, res, next, options) => {
    throw ApiError.tooManyRequests(options.message.message);
  },
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // More lenient than OTP to avoid locking out legitimate users
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
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 10, 
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
