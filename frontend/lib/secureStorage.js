import CryptoJS from "crypto-js";
const APP_KEY = "mk-r3ddy-s3cur3-2026";
const SALT_SLOT = "__ss__";
function getSecret() {
  if (typeof window === "undefined") return APP_KEY;
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
};
export default secureStorage;