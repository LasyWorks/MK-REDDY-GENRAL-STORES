/**
 * Frontend Merge Service
 *
 * Thin wrapper around the backend /auth/merge/* endpoints.
 * All network errors bubble up as plain Error objects so callers can use
 *   err.message  to display the backend message.
 */
import api from '@/lib/api';

const MergeService = {
  /**
   * Send verification OTPs to both email addresses.
   * @param {string} mergeSessionId
   * @returns {Promise<{ message, expiresInSeconds, _dev_primary_otp?, _dev_secondary_otp? }>}
   */
  async sendOTPs(mergeSessionId) {
    const { data } = await api.post('/auth/merge/send-otps', { mergeSessionId });
    return data;
  },

  /**
   * Verify one side's OTP.
   * Returns `{ verified, bothVerified, merged?, user?, accessToken?, refreshToken? }`.
   * When merge is complete (bothVerified + merged) the caller should store tokens and redirect.
   *
   * @param {string} mergeSessionId
   * @param {'primary'|'secondary'} side
   * @param {string} otp
   */
  async verifyOTP(mergeSessionId, side, otp) {
    const { data } = await api.post('/auth/merge/verify-otp', { mergeSessionId, side, otp });
    return data;
  },

  /**
   * Cancel the merge session. Client must then enter a different phone number.
   * @param {string} mergeSessionId
   */
  async cancel(mergeSessionId) {
    const { data } = await api.post('/auth/merge/cancel', { mergeSessionId });
    return data;
  },
};

export default MergeService;
