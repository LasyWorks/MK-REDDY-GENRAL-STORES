const express = require('express');
const router = express.Router();
const { authController } = require('../controllers');
const { authenticate, optionalAuth } = require('../middlewares/auth');
const { otpLimiter, loginLimiter } = require('../middlewares/rateLimiter');
const { validateSendOTP, validateVerifyOTP, validateRegister, validateAdminLogin, validateRefreshToken } = require('../utils/validators');

/**
 * @route   POST /api/v1/auth/otp/send
 * @desc    Send OTP to phone number
 * @access  Public
 */
router.post('/otp/send', otpLimiter, validateSendOTP, authController.sendOTP);

/**
 * @route   POST /api/v1/auth/otp/send-by-email
 * @desc    Send OTP by email (looks up phone from email)
 * @access  Public
 */
router.post('/otp/send-by-email', otpLimiter, authController.sendOTPByEmail);

/**
 * @route   POST /api/v1/auth/otp/verify
 * @desc    Verify OTP and login/register
 * @access  Public
 */
router.post('/otp/verify', loginLimiter, validateVerifyOTP, authController.verifyOTP);

/**
 * @route   POST /api/v1/auth/otp/resend
 * @desc    Resend OTP
 * @access  Public
 */
router.post('/otp/resend', otpLimiter, validateSendOTP, authController.resendOTP);

/**
 * @route   POST /api/v1/auth/register
 * @desc    Complete customer registration
 * @access  Public
 */
router.post('/register', validateRegister, authController.register);

/**
 * @route   POST /api/v1/auth/admin/login
 * @desc    Admin login with email/phone and password
 * @access  Public
 */
router.post('/admin/login', loginLimiter, validateAdminLogin, authController.adminLogin);

/**
 * @route   POST /api/v1/auth/admin/verify-otp
 * @desc    Verify OTP for admin 2FA login
 * @access  Public
 */
router.post('/admin/verify-otp', loginLimiter, authController.adminVerifyOTP);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', validateRefreshToken, authController.refreshToken);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   POST /api/v1/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post('/logout-all', authenticate, authController.logoutAll);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, authController.getMe);

/**
 * @route   PUT /api/v1/auth/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/me', authenticate, authController.updateMe);

/**
 * @route   PUT /api/v1/auth/change-password
 * @desc    Change password (for admin users)
 * @access  Private
 */
router.put('/change-password', authenticate, authController.changePassword);

module.exports = router;
