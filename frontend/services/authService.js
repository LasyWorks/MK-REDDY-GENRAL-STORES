import api from "../lib/api";
import secureStorage from "../lib/secureStorage";
class AuthService {
  async sendOTP(phone, purpose = "login") {
    return api.post("/auth/otp/send", { phone });
  }
  async resendOTP(phone) {
    return api.post("/auth/otp/resend", { phone });
  }
  async verifyOTP(phone, otp) {
    const response = await api.post("/auth/otp/verify", { phone, otp });
    if (response.data?.accessToken) {
      secureStorage.setItem("token", response.data.accessToken);
      secureStorage.setItem("refreshToken", response.data.refreshToken);
      secureStorage.setItem("user", JSON.stringify(response.data.user));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("authChange"));
      }
    }
    return response;
  }
  async register(userData) {
    return api.post("/auth/register", userData);
  }
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
  async logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      secureStorage.removeItem("token");
      secureStorage.removeItem("refreshToken");
      secureStorage.removeItem("user");
      if (typeof window !== "undefined") {
        localStorage.removeItem("mk-reddy-cart");
        window.dispatchEvent(new Event("authChange"));
      }
    }
  }
  getCurrentUser() {
    const userStr = secureStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }
  isAuthenticated() {
    return !!secureStorage.getItem("token");
  }
}
export default new AuthService();
