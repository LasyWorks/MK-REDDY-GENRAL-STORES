const { AuthService } = require('../services');
const { asyncHandler } = require('../middlewares');
const ApiResponse = require('../utils/ApiResponse');

// Google OAuth Login - New primary authentication method
const googleLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  
  const result = await AuthService.googleLogin(idToken, ipAddress);
  
  if (result.requiresRegistration) {
    ApiResponse.success(res, result, 'Google authentication successful. Please complete registration.');
  } else {
    ApiResponse.success(res, result, 'Login successful');
  }
});

// Complete Google OAuth registration with phone number
const completeGoogleRegistration = asyncHandler(async (req, res) => {
  const { name, phone, email, googleId, picture, user_type, address } = req.body;
  
  const result = await AuthService.completeGoogleRegistration({
    name,
    phone,
    email,
    googleId,
    picture,
    user_type,
    address,
  });
  
  ApiResponse.created(res, result, 'Registration completed successfully');
});

// Legacy OTP methods - Kept for admin email-based authentication only
const sendOTP = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const result = await AuthService.sendOTP(phone);
  ApiResponse.success(res, result, 'OTP sent successfully');
});
const sendOTPByEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await AuthService.sendOTPByEmail(email);
  ApiResponse.success(res, result, 'OTP sent successfully');
});
const verifyOTP = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  const result = await AuthService.verifyCustomerOTP(phone, otp);
  if (result.requiresRegistration) {
    ApiResponse.success(res, result, 'OTP verified. Please complete registration.');
  } else {
    ApiResponse.success(res, result, 'Login successful');
  }
});
const register = asyncHandler(async (req, res) => {
  const { name, phone, user_type, address } = req.body;
  const result = await AuthService.registerCustomer({ name, phone, user_type, address });
  ApiResponse.created(res, result, 'Registration successful');
});
const adminLogin = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const result = await AuthService.adminLoginWithPassword(identifier, password, ipAddress);
  ApiResponse.success(res, result, 'Admin login successful');
});
const adminVerifyOTP = asyncHandler(async (req, res) => {
  const { email, phone, otp } = req.body;
  const result = await AuthService.verifyAdminOTP(email, phone, otp);
  ApiResponse.success(res, result, 'Admin login successful');
});
const refreshToken = asyncHandler(async (req, res) => {
  const { refresh_token: refreshToken } = req.body;
  const deviceInfo = req.headers['user-agent'];
  const ipAddress = req.ip || req.connection.remoteAddress;
  const result = await AuthService.refreshTokens(refreshToken, deviceInfo, ipAddress);
  ApiResponse.success(res, result, 'Token refreshed successfully');
});
const logout = asyncHandler(async (req, res) => {
  const { refresh_token: refreshToken } = req.body;
  await AuthService.logout(req.user.id, refreshToken);
  ApiResponse.success(res, null, 'Logged out successfully');
});
const logoutAll = asyncHandler(async (req, res) => {
  await AuthService.logoutAll(req.user.id);
  ApiResponse.success(res, null, 'Logged out from all devices');
});
const getMe = asyncHandler(async (req, res) => {
  ApiResponse.success(res, req.user, 'User profile retrieved');
});
const resendOTP = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const result = await AuthService.sendOTP(phone);
  ApiResponse.success(res, result, 'OTP resent successfully');
});
const updateMe = asyncHandler(async (req, res) => {
  const { name, email, address } = req.body;
  const { UserService } = require('../services');
  const user = await UserService.update(req.user.id, { name, email, address });
  ApiResponse.success(res, user, 'Profile updated successfully');
});
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const { PasswordService } = require('../services');
  const result = await PasswordService.changePassword(req.user.id, currentPassword, newPassword);
  ApiResponse.success(res, result, result.message);
});

// Customer Email OTP Login
const sendCustomerEmailOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await AuthService.sendCustomerEmailOTP(email);
  ApiResponse.success(res, result, 'OTP sent successfully');
});

const verifyCustomerEmailOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const result = await AuthService.verifyCustomerEmailOTP(email, otp);
  
  if (result.requiresRegistration) {
    ApiResponse.success(res, result, 'OTP verified. Please complete registration with phone number.');
  } else {
    ApiResponse.success(res, result, 'Login successful');
  }
});

const completeEmailOTPRegistration = asyncHandler(async (req, res) => {
  const { name, phone, email, user_type, address } = req.body;
  const result = await AuthService.completeEmailOTPRegistration({
    name,
    phone,
    email,
    user_type,
    address,
  });
  ApiResponse.created(res, result, 'Registration completed successfully');
});

module.exports = {
  googleLogin,
  completeGoogleRegistration,
  sendOTP,
  sendOTPByEmail,
  sendCustomerEmailOTP,
  verifyOTP,
  verifyCustomerEmailOTP,
  completeEmailOTPRegistration,
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
