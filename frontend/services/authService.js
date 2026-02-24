import api from "../lib/api";
import secureStorage from "../lib/secureStorage";

/**
 * Authentication API Service
 */
class AuthService {
  /**
   * Send OTP to phone number
   * @param {string} phone - Phone number
   * @param {string} purpose - 'login' or 'register'
   * @returns {Promise} Response
   */
  async sendOTP(phone, purpose = "login") {
    return api.post("/auth/otp/send", { phone });
  }

  /**
   * Resend OTP
   */
  async resendOTP(phone) {
    return api.post("/auth/otp/resend", { phone });
  }

  /**
   * Verify OTP
   * @param {string} phone - Phone number
   * @param {string} otp - OTP code
   * @returns {Promise} Auth tokens and user data
   */
  async verifyOTP(phone, otp) {
    const response = await api.post("/auth/otp/verify", { phone, otp });

    // Store tokens and user data
    if (response.data?.accessToken) {
      secureStorage.setItem("token", response.data.accessToken);
      secureStorage.setItem("refreshToken", response.data.refreshToken);
      secureStorage.setItem("user", JSON.stringify(response.data.user));
    }

    return response;
  }

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Promise} Response
   */
  async register(userData) {
    return api.post("/auth/register", userData);
  }

  /**
   * Refresh access token
   * @returns {Promise} New access token
   */
  async refreshToken() {
    const refreshToken = secureStorage.getItem("refreshToken");
    const response = await api.post("/auth/refresh", {
      refresh_token: refreshToken,
    });

    if (response.data?.accessToken) {
      secureStorage.setItem("token", response.data.accessToken);
    }

    return response;
  }

  /**
   * Logout user
   * @returns {Promise} Response
   */
  async logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      // Clear local storage regardless of API response
      secureStorage.removeItem("token");
      secureStorage.removeItem("refreshToken");
      secureStorage.removeItem("user");
    }
  }

  /**
   * Get current user
   * @returns {Object|null} User object or null
   */
  getCurrentUser() {
    const userStr = secureStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated() {
    return !!secureStorage.getItem("token");
  }
}

export default new AuthService();
