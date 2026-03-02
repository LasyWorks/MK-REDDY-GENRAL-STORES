const express = require('express');
const router  = express.Router();
const { sendMergeOTPs, verifyMergeOTP, cancelMerge } = require('../controllers/mergeController');
const { otpLimiter, loginLimiter } = require('../middlewares/rateLimiter');

// Send OTPs to both email addresses in the merge session
// Rate-limited: reuses otpLimiter (same as auth OTP sends)
router.post('/send-otps', otpLimiter, sendMergeOTPs);

// Verify one side of the merge.  loginLimiter prevents brute-force on OTPs.
router.post('/verify-otp', loginLimiter, verifyMergeOTP);

// Cancel the merge; client must enter a different phone number
router.post('/cancel', cancelMerge);

module.exports = router;
