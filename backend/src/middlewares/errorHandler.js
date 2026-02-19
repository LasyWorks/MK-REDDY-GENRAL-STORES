const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Convert non-ApiError to ApiError
 */
const normalizeError = (err) => {
  if (err instanceof ApiError) {
    return err;
  }

  // MySQL errors
  if (err.code) {
    switch (err.code) {
      case 'ER_DUP_ENTRY':
        return ApiError.conflict('Duplicate entry. Resource already exists.');
      case 'ER_NO_REFERENCED_ROW':
      case 'ER_NO_REFERENCED_ROW_2':
        return ApiError.badRequest('Referenced resource does not exist.');
      case 'ER_ROW_IS_REFERENCED':
      case 'ER_ROW_IS_REFERENCED_2':
        return ApiError.conflict('Cannot delete. Resource is referenced by other records.');
      case 'ECONNREFUSED':
        return ApiError.internal('Database connection failed.');
      default:
        break;
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ApiError.unauthorized('Invalid token.');
  }
  if (err.name === 'TokenExpiredError') {
    return ApiError.unauthorized('Token expired.');
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return ApiError.badRequest('File too large.');
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return ApiError.badRequest('Unexpected file field.');
  }

  // Syntax errors (JSON parsing)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return ApiError.badRequest('Invalid JSON in request body.');
  }

  return ApiError.internal(err.message || 'An unexpected error occurred.');
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  const error = normalizeError(err);

  // Log error
  const logData = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.id,
    statusCode: error.statusCode,
    message: error.message,
  };

  if (error.statusCode >= 500) {
    logger.error('Server Error:', { ...logData, stack: err.stack });
  } else {
    logger.warn('Client Error:', logData);
  }

  // Send response
  const response = {
    success: false,
    status: error.status,
    message: error.message,
    timestamp: new Date().toISOString(),
  };

  // Include errors array if present
  if (error.errors) {
    response.errors = error.errors;
  }

  // Include stack trace in development
  if (config.env === 'development') {
    response.stack = err.stack;
  }

  res.status(error.statusCode).json(response);
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

/**
 * Async handler to catch promise rejections
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
};
