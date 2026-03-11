import CryptoJS from "crypto-js";
// Base encryption key - combined with unique salt per browser for security
const APP_KEY = "mk-r3ddy-s3cur3-2026";
const SALT_SLOT = "__ss__";
function getSecret() {
  if (typeof window === "undefined") return APP_KEY;
  // Generate unique salt per browser so tokens can't be copied between devices
  let salt = localStorage.getItem(SALT_SLOT);
  if (!salt) {
    salt = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    localStorage.setItem(SALT_SLOT, salt);
  }
  return APP_KEY + salt;
}
const secureStorage = {
  setItem(key, value) {
    if (typeof window === "undefined") return;
    if (value === undefined || value === null) {
      this.removeItem(key);
      return;
    }
    const str = typeof value === "string" ? value : JSON.stringify(value);
    // Encrypt tokens so they're not readable in browser DevTools
    const encrypted = CryptoJS.AES.encrypt(str, getSecret()).toString();
    localStorage.setItem(key, encrypted);
  },
  getItem(key) {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      const bytes = CryptoJS.AES.decrypt(raw, getSecret());
      return bytes.toString(CryptoJS.enc.Utf8) || null;
    } catch {
      // Return null if decryption fails (corrupted data or wrong device)
      return null;
    }
  },
  removeItem(key) {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  },
  clear(...keys) {
    keys.forEach((k) => this.removeItem(k));
  },

  // Session-scoped variants — data clears when the tab is closed
  session: {
    setItem(key, value) {
      if (typeof window === "undefined") return;
      if (value === undefined || value === null) { this.removeItem(key); return; }
      const str = typeof value === "string" ? value : JSON.stringify(value);
      const encrypted = CryptoJS.AES.encrypt(str, getSecret()).toString();
      sessionStorage.setItem(key, encrypted);
    },
    getItem(key) {
      if (typeof window === "undefined") return null;
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      try {
        const bytes = CryptoJS.AES.decrypt(raw, getSecret());
        return bytes.toString(CryptoJS.enc.Utf8) || null;
      } catch {
        return null;
      }
    },
    removeItem(key) {
      if (typeof window === "undefined") return;
      sessionStorage.removeItem(key);
    },
  },
};
export default secureStorage;
