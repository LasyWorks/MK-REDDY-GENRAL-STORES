const express = require('express');
const router = express.Router();
const { authController } = require('../controllers');
const { authenticate, optionalAuth } = require('../middlewares/auth');
const { otpLimiter, loginLimiter } = require('../middlewares/rateLimiter');
const { 
  validateSendOTP, 
  validateVerifyOTP, 
  validateRegister, 
  validateSendEmailOTP,
  validateVerifyEmailOTP,
  validateEmailOTPRegister,
  validateGoogleLogin, 
  validateGoogleRegister, 
  validateAdminLogin, 
  validateRefreshToken 
} = require('../utils/validators');

// Google OAuth 2.0 Routes (Primary Authentication)
router.post('/google/login', loginLimiter, validateGoogleLogin, authController.googleLogin);
router.post('/google/register', validateGoogleRegister, authController.completeGoogleRegistration);

// SMS/Phone OTP routes - REMOVED (No longer using SMS-based authentication for customers)
// router.post('/otp/send', otpLimiter, validateSendOTP, authController.sendOTP);
// router.post('/otp/verify', loginLimiter, validateVerifyOTP, authController.verifyOTP);
// router.post('/otp/resend', otpLimiter, validateSendOTP, authController.resendOTP);
// router.post('/register', validateRegister, authController.register);

// Email OTP (kept for admin authentication and password recovery)
router.post('/otp/send-by-email', otpLimiter, authController.sendOTPByEmail);

// Customer Email OTP Login (New - allows login/registration via email + phone)
router.post('/email-otp/send', otpLimiter, validateSendEmailOTP, authController.sendCustomerEmailOTP);
router.post('/email-otp/verify', loginLimiter, validateVerifyEmailOTP, authController.verifyCustomerEmailOTP);
router.post('/email-otp/register', validateEmailOTPRegister, authController.completeEmailOTPRegistration);

// Admin Authentication
router.post('/admin/login', loginLimiter, validateAdminLogin, authController.adminLogin);
router.post('/admin/verify-otp', loginLimiter, authController.adminVerifyOTP);

// Token Management
router.post('/refresh', validateRefreshToken, authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);

// User Profile
router.get('/me', authenticate, authController.getMe);
router.put('/me', authenticate, authController.updateMe);
router.put('/change-password', authenticate, authController.changePassword);

module.exports = router;
