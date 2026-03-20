const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const config = require('../config');
const normalizeError = (err) => {
  // Convert all errors to ApiError format for consistent API responses
  if (err instanceof ApiError) {
    return err;
  }
  // Database errors need friendly messages - don't expose internal DB structure
  if (err.code) {
    switch (err.code) {
      // MySQL errors
      case 'ER_DUP_ENTRY':
        return ApiError.conflict('Duplicate entry. Resource already exists.');
      case 'ER_NO_REFERENCED_ROW':
      case 'ER_NO_REFERENCED_ROW_2':
        return ApiError.badRequest('Referenced resource does not exist.');
      case 'ER_ROW_IS_REFERENCED':
      case 'ER_ROW_IS_REFERENCED_2':
        return ApiError.conflict('Cannot delete. Resource is referenced by other records.');
      // PostgreSQL errors
      case '22P02': // invalid_text_representation (e.g. invalid UUID format)
        logger.error('22P02 invalid_text_representation:', {
          message: err.message,
          detail: err.detail,
          where: err.where,
          table: err.table,
          column: err.column,
          routine: err.routine,
        });
        return ApiError.badRequest('Invalid ID format.');
      case '22003': // numeric_value_out_of_range
        return ApiError.badRequest('Numeric value out of range.');
      case '22001': // string_data_right_truncation
        return ApiError.badRequest('One or more text fields exceed the maximum allowed length.');
      case '23505': // unique_violation
        return ApiError.conflict('Duplicate entry. Resource already exists.');
      case '23503': // foreign_key_violation
        return ApiError.conflict('Cannot complete operation. A related record is still referenced.');
      case '23502': // not_null_violation
        return ApiError.badRequest(`Missing required field: ${err.column || 'unknown'}`);
      case '42703': // undefined_column
        return ApiError.badRequest('Invalid field name in query.');
      case '42P01': // undefined_table
        return ApiError.internal('Database schema error.');
      case '08006': // connection_failure
      case '08001': // sqlclient_unable_to_establish_sqlconnection
      case 'ECONNREFUSED':
        return ApiError.internal('Database connection failed.');
      default:
        break;
    }
  }
  if (err.name === 'JsonWebTokenError') {
    return ApiError.unauthorized('Invalid token.');
  }
  if (err.name === 'TokenExpiredError') {
    return ApiError.unauthorized('Token expired.');
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return ApiError.badRequest('File too large.');
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return ApiError.badRequest('Unexpected file field.');
  }
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return ApiError.badRequest('Invalid JSON in request body.');
  }
  return ApiError.internal(err.message || 'An unexpected error occurred.');
};
const errorHandler = (err, req, res, next) => {
  const error = normalizeError(err);
  const logData = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.id,
    statusCode: error.statusCode,
    message: error.message,
    ...(error.errors && { validationErrors: error.errors }),
  };
  // 500+ errors are server issues (log with stack), 400s are client mistakes (warn only)
  if (error.statusCode >= 500) {
    logger.error('Server Error:', { ...logData, stack: err.stack });
  } else {
    logger.warn('Client Error:', logData);
  }
  const response = {
    success: false,
    status: error.status,
    message: error.message,
    timestamp: new Date().toISOString(),
  };

  if (config.env === 'production' && error.statusCode >= 500) {
    response.message = 'Internal server error';
  }

  if (error.errors) {
    response.errors = error.errors;
  }

  if (config.env === 'development') {
    response.stack = err.stack;
  }

  res.status(error.statusCode).json(response);
};
const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
};
