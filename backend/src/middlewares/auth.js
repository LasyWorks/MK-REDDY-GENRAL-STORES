const jwt = require('jsonwebtoken');
const config = require('../config');
const ApiError = require('../utils/ApiError');
const { query } = require('../config/database');
// Check if user is logged in with valid token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    // Check for Bearer token in header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Access token is required');
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await query(
      `SELECT u.*, r.name as role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = $1 AND u.is_active = TRUE`,
      [decoded.userId]
    );
    if (!user.length) {
      throw ApiError.unauthorized('User not found or inactive');
    }
    req.user = {
      id: user[0].id,
      name: user[0].name,
      phone: user[0].phone,
      email: user[0].email,
      role: user[0].role_name,
      roleId: user[0].role_id,
      userType: user[0].user_type,
      user_type: user[0].user_type,
    };
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else if (error.name === 'JsonWebTokenError') {
      next(ApiError.unauthorized('Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      next(ApiError.unauthorized('Token expired'));
    } else {
      next(error);
    }
  }
};
// Check for token but allow request to continue even without one
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    // Skip if no token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await query(
      `SELECT u.*, r.name as role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = $1 AND u.is_active = TRUE`,
      [decoded.userId]
    );
    if (user.length) {
      req.user = {
        id: user[0].id,
        name: user[0].name,
        phone: user[0].phone,
        email: user[0].email,
        role: user[0].role_name,
        roleId: user[0].role_id,
        userType: user[0].user_type,
        user_type: user[0].user_type,
      };
    }
    next();
  } catch (error) {
    // Silently continue even if token is invalid - this is optional auth
    next();
  }
};
// Check if user has the right role to access this page
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    // Check if user's role is in the allowed list
    if (!allowedRoles.includes(req.user.role)) {
      const rolesList = allowedRoles.join(', ');
      return next(ApiError.forbidden(
        `You do not have permission to perform this action. Required role(s): ${rolesList}. Your role: ${req.user.role}`
      ));
    }
    next();
  };
};
// Quick shortcuts for common role checks
const adminOnly = authorize('admin');
const customerOnly = authorize('retail_customer', 'wholesale_customer');
const verifyRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw ApiError.badRequest('Refresh token is required');
    }
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    // Verify refresh token exists in database and hasn't been revoked (security measure for logout)
    const tokenRecord = await query(
      `SELECT * FROM refresh_tokens 
       WHERE token = $1 AND user_id = $2 AND expires_at > NOW() AND revoked = FALSE`,
      [refreshToken, decoded.userId]
    );
    if (!tokenRecord.length) {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }
    req.refreshTokenData = {
      userId: decoded.userId,
      tokenRecord: tokenRecord[0],
    };
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(ApiError.unauthorized('Invalid refresh token'));
    }
  }
};
module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  adminOnly,
  customerOnly,
  verifyRefreshToken,
};
