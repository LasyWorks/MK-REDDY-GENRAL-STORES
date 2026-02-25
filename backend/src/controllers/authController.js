const { AuthService } = require('../services');
const { asyncHandler } = require('../middlewares');
const ApiResponse = require('../utils/ApiResponse');

/**
 * @desc    Send OTP to phone number
 * @route   POST /api/v1/auth/send-otp
 * @access  Public
 */
const sendOTP = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const result = await AuthService.sendOTP(phone);
  ApiResponse.success(res, result, 'OTP sent successfully');
});

/**
 * @desc    Send OTP by email (lookup phone from email)
 * @route   POST /api/v1/auth/otp/send-by-email
 * @access  Public
 */
const sendOTPByEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await AuthService.sendOTPByEmail(email);
  ApiResponse.success(res, result, 'OTP sent successfully');
});

/**
 * @desc    Verify OTP and login customer
 * @route   POST /api/v1/auth/verify-otp
 * @access  Public
 */
const verifyOTP = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  const result = await AuthService.verifyCustomerOTP(phone, otp);
  
  if (result.requiresRegistration) {
    ApiResponse.success(res, result, 'OTP verified. Please complete registration.');
  } else {
    ApiResponse.success(res, result, 'Login successful');
  }
});

/**
 * @desc    Register new customer
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { name, phone, user_type, address } = req.body;
  const result = await AuthService.registerCustomer({ name, phone, user_type, address });
  ApiResponse.created(res, result, 'Registration successful');
});

/**
 * @desc    Admin login with email/phone and password
 * @route   POST /api/v1/auth/admin/login
 * @access  Public
 */
const adminLogin = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const result = await AuthService.adminLoginWithPassword(identifier, password);
  ApiResponse.success(res, result, 'OTP sent to registered phone');
});

/**
 * @desc    Admin verify OTP
 * @route   POST /api/v1/auth/admin/verify-otp
 * @access  Public
 */
const adminVerifyOTP = asyncHandler(async (req, res) => {
  const { email, phone, otp } = req.body;
  const result = await AuthService.verifyAdminOTP(email, phone, otp);
  ApiResponse.success(res, result, 'Admin login successful');
});

/**
 * @desc    Refresh access token
 * @route   POST /api/v1/auth/refresh-token
 * @access  Public
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refresh_token: refreshToken } = req.body;
  const result = await AuthService.refreshTokens(refreshToken);
  ApiResponse.success(res, result, 'Token refreshed successfully');
});

/**
 * @desc    Logout
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  const { refresh_token: refreshToken } = req.body;
  await AuthService.logout(req.user.id, refreshToken);
  ApiResponse.success(res, null, 'Logged out successfully');
});

/**
 * @desc    Logout from all devices
 * @route   POST /api/v1/auth/logout-all
 * @access  Private
 */
const logoutAll = asyncHandler(async (req, res) => {
  await AuthService.logoutAll(req.user.id);
  ApiResponse.success(res, null, 'Logged out from all devices');
});

/**
 * @desc    Get current user profile
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  ApiResponse.success(res, req.user, 'User profile retrieved');
});

/**
 * @desc    Resend OTP
 * @route   POST /api/v1/auth/otp/resend
 * @access  Public
 */
const resendOTP = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const result = await AuthService.sendOTP(phone);
  ApiResponse.success(res, result, 'OTP resent successfully');
});

/**
 * @desc    Update current user profile
 * @route   PUT /api/v1/auth/me
 * @access  Private
 */
const updateMe = asyncHandler(async (req, res) => {
  const { name, email, address } = req.body;
  const { UserService } = require('../services');
  const user = await UserService.update(req.user.id, { name, email, address });
  ApiResponse.success(res, user, 'Profile updated successfully');
});

/**
 * @desc    Change password (for admin users)
 * @route   PUT /api/v1/auth/change-password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await AuthService.changePassword(req.user.id, currentPassword, newPassword);
  ApiResponse.success(res, null, 'Password changed successfully');
});

module.exports = {
  sendOTP,
  sendOTPByEmail,
  verifyOTP,
  resendOTP,
  register,
  adminLogin,
  adminVerifyOTP,
  refreshToken,
  logout,
  logoutAll,
  getMe,
  updateMe,
  changePassword,
};
