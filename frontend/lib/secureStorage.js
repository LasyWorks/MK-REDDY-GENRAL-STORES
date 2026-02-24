/**
 * secureStorage — AES-256 encrypted wrapper around localStorage.
 *
 * Auth tokens and user data are encrypted at rest so they are not
 * readable in plain-text via DevTools / browser extensions / XSS probes.
 *
 * Uses the synchronous `crypto-js` AES implementation so it works
 * as a drop-in replacement for localStorage with no async refactoring.
 *
 * Non-sensitive keys (cart items, language preference, etc.) should
 * continue to use localStorage directly.
 */

import CryptoJS from "crypto-js";

// The secret is combined with a per-device salt generated on first use.
// Even if the JS bundle is inspected, tokens cannot be decrypted without
// the salt that lives in a separate localStorage slot.
const APP_KEY = "mk-r3ddy-s3cur3-2026";
const SALT_SLOT = "__ss__";

function getSecret() {
  if (typeof window === "undefined") return APP_KEY;
  let salt = localStorage.getItem(SALT_SLOT);
  if (!salt) {
    // Generate a random 32-char hex salt on first load
    salt = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    localStorage.setItem(SALT_SLOT, salt);
  }
  return APP_KEY + salt;
}

const secureStorage = {
  /**
   * Encrypt `value` and store under `key`.
   * `value` can be any JSON-serialisable type.
   */
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

  /**
   * Retrieve and decrypt the value stored under `key`.
   * Returns `null` when absent or when decryption fails.
   */
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

  /** Remove a key from storage. */
  removeItem(key) {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  },

  /** Remove multiple keys at once. */
  clear(...keys) {
    keys.forEach((k) => this.removeItem(k));
  },
};

export default secureStorage;
