import api from "../lib/api";
import secureStorage from "../lib/secureStorage";
class AuthService {
  getMissingProfileFields(user = null) {
    const current = user || this.getCurrentUser();
    if (!current) return [];

    const isCustomer =
      current.user_type === "retail" || current.user_type === "wholesale";
    if (!isCustomer) return [];

    const missing = [];
    if (!current.display_name) missing.push("display_name");
    if (!current.date_of_birth) missing.push("date_of_birth");
    return missing;
  }

  requiresProfileCompletion(user = null) {
    return this.getMissingProfileFields(user).length > 0;
  }

  getProfileCompletionLoginHref(redirect = "/") {
    const encodedRedirect = encodeURIComponent(redirect || "/");
    return `/login?redirect=${encodedRedirect}&profile_complete=1`;
  }

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
    // Clear local state immediately so the user is logged out right away.
    // Fire the backend call in the background to invalidate the refresh token.
    secureStorage.removeItem("token");
    secureStorage.removeItem("refreshToken");
    secureStorage.removeItem("user");
    if (typeof window !== "undefined") {
      localStorage.removeItem("mk-reddy-cart");
      window.dispatchEvent(new Event("authChange"));
    }
    api.post("/auth/logout").catch(() => {});
  }
  getCurrentUser() {
    const userStr = secureStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }
  isAuthenticated() {
    return !!secureStorage.getItem("token");
  }
}

const authService = new AuthService();
export default authService;
