import secureStorage from "./secureStorage";
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
const LANGUAGE_STORAGE_KEY = "mk-reddy-lang";
const LEGACY_LANGUAGE_STORAGE_KEY = "language";

// Handle session expiry — clear storage and redirect to login
function handleSessionExpired() {
  secureStorage.removeItem("token");
  secureStorage.removeItem("refreshToken");
  secureStorage.removeItem("user");
  if (typeof window !== "undefined") {
    localStorage.removeItem("mk-reddy-cart");
    window.dispatchEvent(new Event("authChange"));
    window.location.href = "/login?reason=session_expired";
  }
}

class ApiClient {
  constructor(baseURL = API_URL) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      "Content-Type": "application/json",
    };
    this._refreshing = false;
    this._refreshQueue = [];
    this._inflightGets = new Map();
  }

  // Attempt to refresh access token; queue concurrent requests while refreshing
  async _tryRefreshToken() {
    if (this._refreshing) {
      return new Promise((resolve, reject) => {
        this._refreshQueue.push({ resolve, reject });
      });
    }
    this._refreshing = true;
    try {
      const refreshToken = secureStorage.getItem("refreshToken");
      if (!refreshToken) throw new Error("No refresh token");

      const res = await fetch(`${this.baseURL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.data?.accessToken)
        throw new Error("Refresh failed");

      const newToken = data.data.accessToken;
      secureStorage.setItem("token", newToken);
      // Also refresh the stored user object so any admin-changed user_type or role
      // is picked up without requiring the user to log out and back in.
      fetch(`${this.baseURL}/auth/profile`, {
        headers: { Authorization: `Bearer ${newToken}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.data) secureStorage.setItem("user", JSON.stringify(d.data));
        })
        .catch(() => {});
      this._refreshQueue.forEach((p) => p.resolve(newToken));
      return newToken;
    } catch (err) {
      this._refreshQueue.forEach((p) => p.reject(err));
      throw err;
    } finally {
      this._refreshing = false;
      this._refreshQueue = [];
    }
  }

  async request(endpoint, options = {}, _retry = false) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    };
    if (typeof window !== "undefined") {
      const lang =
        localStorage.getItem(LANGUAGE_STORAGE_KEY) ||
        localStorage.getItem(LEGACY_LANGUAGE_STORAGE_KEY) ||
        "en";
      config.headers["Accept-Language"] = lang;
    }
    if (typeof window !== "undefined") {
      const token = secureStorage.getItem("token");
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }

      if (!navigator.onLine) {
        throw new Error("No internet connection. Please check your network.");
      }
    }
    try {
      const response = await fetch(url, config);

      // Safely parse JSON — backend may return HTML on server errors
      let data = {};
      try {
        data = await response.json();
      } catch {
        // Non-JSON response (e.g. 502 HTML from proxy or server down)
        if (!response.ok) {
          throw new Error(
            `Server error: ${response.status} ${response.statusText}`,
          );
        }
      }

      if (!response.ok) {
        // Auto-refresh on token expiry (only attempt once)
        if (response.status === 401 && !_retry) {
          try {
            await this._tryRefreshToken();
            return this.request(endpoint, options, true);
          } catch {
            handleSessionExpired();
            throw new Error("Session expired. Please log in again.");
          }
        }

        let errorMessage =
          data.message || `${response.status} ${response.statusText}`;
        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          const details = data.errors.map(e => `${e.field}: ${e.message}`).join(", ");
          errorMessage = `${errorMessage} (${details})`;
        }
        // Only log server-side errors (5xx); 4xx are expected business cases handled by callers
        if (response.status >= 500) {
          console.error(
            "API Error:",
            response.status,
            response.statusText,
            endpoint,
            errorMessage,
          );
        }
        throw new Error(errorMessage);
      }
      return data;
    } catch (error) {
      if (
        typeof window !== "undefined" &&
        error.name === "TypeError" &&
        error.message === "Failed to fetch" &&
        !navigator.onLine
      ) {
        throw new Error("No internet connection. Please check your network.");
      }

      if (error.name === "TypeError" && error.message === "Failed to fetch") {
        console.error("API Error: Cannot reach server at", url);
        throw new Error("Cannot connect to server. Please try again later.");
      }
      throw error;
    }
  }
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    if (this._inflightGets.has(url)) return this._inflightGets.get(url);
    const promise = this.request(url, { method: "GET" }).finally(() =>
      this._inflightGets.delete(url),
    );
    this._inflightGets.set(url, promise);
    return promise;
  }
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }
  async delete(endpoint) {
    return this.request(endpoint, {
      method: "DELETE",
    });
  }
}
export const api = new ApiClient();
export default api;
