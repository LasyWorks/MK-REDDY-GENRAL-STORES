const MergeService  = require('../services/mergeService');
const { asyncHandler } = require('../middlewares');
const ApiResponse    = require('../utils/ApiResponse');
const ApiError       = require('../utils/ApiError');

/**
 * POST /api/v1/auth/merge/send-otps
 * Body: { mergeSessionId }
 * Sends verification OTPs to both email addresses in the merge session.
 */
const sendMergeOTPs = asyncHandler(async (req, res) => {
  const { mergeSessionId } = req.body;
  if (!mergeSessionId) throw ApiError.badRequest('mergeSessionId is required');
  const ipAddress = req.ip || req.connection?.remoteAddress;
  const result = await MergeService.sendOTPs({ mergeSessionId, ipAddress });
  ApiResponse.success(res, result, result.message);
});

/**
 * POST /api/v1/auth/merge/verify-otp
 * Body: { mergeSessionId, side: 'primary'|'secondary', otp }
 * Verifies one side of the merge.  If both sides are verified the merge executes
 * automatically and JWT tokens are returned in the response.
 */
const verifyMergeOTP = asyncHandler(async (req, res) => {
  const { mergeSessionId, side, otp } = req.body;
  if (!mergeSessionId || !side || !otp) {
    throw ApiError.badRequest('mergeSessionId, side, and otp are required');
  }
  const ipAddress = req.ip || req.connection?.remoteAddress;
  const result = await MergeService.verifyOTP({ mergeSessionId, side, otp: String(otp).trim(), ipAddress });

  const message = result.merged
    ? 'Accounts merged successfully! You are now logged in.'
    : `${side === 'primary' ? 'New' : 'Existing'} account verified. ${result.bothVerified ? '' : 'Please verify the other account now.'}`;

  ApiResponse.success(res, result, message);
});

/**
 * POST /api/v1/auth/merge/cancel
 * Body: { mergeSessionId }
 * Cancels the merge session and cleans up OTPs.
 */
const cancelMerge = asyncHandler(async (req, res) => {
  const { mergeSessionId } = req.body;
  if (!mergeSessionId) throw ApiError.badRequest('mergeSessionId is required');
  const ipAddress = req.ip || req.connection?.remoteAddress;
  const result = await MergeService.cancelSession({ mergeSessionId, ipAddress });
  ApiResponse.success(res, result, 'Merge cancelled. Please use a different phone number.');
});

module.exports = { sendMergeOTPs, verifyMergeOTP, cancelMerge };
