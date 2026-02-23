import api from "../lib/api";

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
    return api.post("/auth/send-otp", { phone, purpose });
  }

  /**
   * Verify OTP
   * @param {string} phone - Phone number
   * @param {string} otp - OTP code
   * @returns {Promise} Auth tokens and user data
   */
  async verifyOTP(phone, otp) {
    const response = await api.post("/auth/verify-otp", { phone, otp });

    // Store tokens and user data
    if (response.data?.access_token) {
      localStorage.setItem("token", response.data.access_token);
      localStorage.setItem("refreshToken", response.data.refresh_token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
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
    const refreshToken = localStorage.getItem("refreshToken");
    const response = await api.post("/auth/refresh-token", {
      refresh_token: refreshToken,
    });

    if (response.data?.access_token) {
      localStorage.setItem("token", response.data.access_token);
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
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    }
  }

  /**
   * Get current user
   * @returns {Object|null} User object or null
   */
  getCurrentUser() {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated() {
    return !!localStorage.getItem("token");
  }
}

export default new AuthService();
