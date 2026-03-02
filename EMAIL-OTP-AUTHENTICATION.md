# Email OTP Authentication Implementation

## Overview
Added email OTP-based authentication as an alternative to Google OAuth login. Both authentication methods require phone number collection during registration for order delivery coordination.

## Features Implemented

### 1. Database Migration
- **File**: `backend/src/database/migrate-email-otp.js`
- Added `email` column to `otps` table
- Made `phone` column nullable to support email-based OTPs
- Added constraint: either phone OR email must be present
- Created index on email column for performance

### 2. Backend Changes

#### OTP Model Updates
- **File**: `backend/src/models/OTP.js`
- New methods:
  - `createByEmail(email, otpHash, purpose, expiryMinutes)` - Create OTP for email
  - `findValidByEmail(email, purpose)` - Find valid OTP by email
  - `countRecentByEmail(email, windowSeconds)` - Rate limiting for email OTPs

#### Authentication Service
- **File**: `backend/src/services/authService.js`
- New methods:
  - `sendCustomerEmailOTP(email)` - Send OTP to any email (new or existing users)
  - `verifyCustomerEmailOTP(email, otp)` - Verify OTP and return user or requiresRegistration flag
  - `completeEmailOTPRegistration(userData)` - Register new user with email + phone (required)

#### Controllers & Routes
- **File**: `backend/src/controllers/authController.js`
- New controller methods:
  - `sendCustomerEmailOTP` - Handle send OTP request
  - `verifyCustomerEmailOTP` - Handle OTP verification
  - `completeEmailOTPRegistration` - Handle registration completion

- **File**: `backend/src/routes/authRoutes.js`
- New routes:
  ```
  POST /api/v1/auth/email-otp/send       - Send OTP to email
  POST /api/v1/auth/email-otp/verify     - Verify OTP code
  POST /api/v1/auth/email-otp/register   - Complete registration with phone
  ```

#### Validators
- **File**: `backend/src/utils/validators.js`
- New validators:
  - `validateSendEmailOTP` - Email format validation
  - `validateVerifyEmailOTP` - Email + OTP validation
  - `validateEmailOTPRegister` - Name, phone, email, user type validation

### 3. Frontend Changes

#### Login Page
- **File**: `frontend/app/login/page.jsx`
- Multi-step authentication flow with two methods:

#### Login Flow Options:

**Option 1: Google OAuth (Existing)**
1. Click "Sign in with Google"
2. Complete Google authentication
3. If new user: Provide phone number
4. Registration complete

**Option 2: Email OTP (New)**
1. Click "Sign in with Email OTP"
2. Enter email address
3. Receive and enter 6-digit OTP
4. If new user: Provide phone number (mandatory)
5. Registration complete

#### UI Components:
- Method selection screen (Google vs Email OTP)
- Email input screen
- OTP verification screen (6-digit code)
- Phone collection screen (shared between both methods)
- Success/complete screen

## Phone Number Requirement

**IMPORTANT**: Phone number is mandatory for ALL new user registrations regardless of authentication method (Google OAuth or Email OTP).

### Why Phone is Required:
- Order delivery coordination
- SMS notifications for order updates
- Urgent communication about deliveries
- Customer support contact

### Implementation:
- Google OAuth: Collected after Google authentication
- Email OTP: Collected after OTP verification
- Both flows enforce phone validation (10-digit Indian mobile number)
- Registration cannot complete without valid phone number

## User Types
Users can select their type during registration:
- **Regular**: Standard retail customers
- **Premium**: Premium membership customers
- **Wholesale**: Bulk purchase customers

## Security Features

### Rate Limiting
- OTP requests: Limited to 1 per 30 seconds per email/phone
- Login attempts: Rate limited via loginLimiter middleware

### OTP Security
- 6-digit numeric codes
- 5-minute expiration
- Maximum 3 verification attempts per OTP
- Automatic deletion after verification or max attempts
- Development mode: OTP visible in console for testing

### Email Verification
- Email ownership verified via OTP
- `email_verified` flag set to true for email OTP registrations

## API Response Examples

### Send Email OTP
```json
POST /api/v1/auth/email-otp/send
Request: { "email": "user@example.com" }

Response: {
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "message": "OTP sent successfully to your email",
    "expiresIn": 300,
    "email": "user@example.com"
  }
}
```

### Verify Email OTP (Existing User)
```json
POST /api/v1/auth/email-otp/verify
Request: { "email": "user@example.com", "otp": "123456" }

Response: {
  "success": true,
  "data": {
    "authenticated": true,
    "user": { /* user object */ },
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

### Verify Email OTP (New User)
```json
POST /api/v1/auth/email-otp/verify
Request: { "email": "newuser@example.com", "otp": "123456" }

Response: {
  "success": true,
  "message": "OTP verified. Please complete registration with phone number.",
  "data": {
    "authenticated": false,
    "requiresRegistration": true,
    "requiresPhone": true,
    "email": "newuser@example.com"
  }
}
```

### Complete Registration
```json
POST /api/v1/auth/email-otp/register
Request: {
  "name": "John Doe",
  "phone": "9876543210",
  "email": "newuser@example.com",
  "user_type": "regular",
  "address": "123 Main St (optional)"
}

Response: {
  "success": true,
  "message": "Registration completed successfully",
  "data": {
    "user": { /* user object */ },
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

## Testing

### Development Environment
- OTP codes visible in console logs
- OTP visible in API response for testing
- Check backend logs for generated OTP codes

### Test Flow:
1. Navigate to http://localhost:3000/login
2. Click "Sign in with Email OTP"
3. Enter test email address
4. Check console for OTP (dev mode)
5. Enter OTP code
6. If new user: Enter phone number (10 digits)
7. Complete registration

### Phone Number Validation:
- Must be exactly 10 digits
- Must start with 6-9 (Indian mobile format)
- Automatically filters non-numeric input

## Configuration

### Environment Variables
No new environment variables required. Uses existing:
- `SMTP_*` - Email configuration (already set up)
- `JWT_SECRET` - Token generation
- `OTP_EXPIRY_MINUTES` - OTP expiration (default: 5)
- `OTP_MAX_ATTEMPTS` - Max verification attempts (default: 3)

## Database Schema Changes

### otps table
```sql
ALTER TABLE otps 
  ADD COLUMN email VARCHAR(255),
  ALTER COLUMN phone DROP NOT NULL,
  ADD CONSTRAINT otps_identifier_check CHECK (
    (phone IS NOT NULL AND email IS NULL) OR 
    (phone IS NULL AND email IS NOT NULL)
  );

CREATE INDEX idx_otps_email ON otps(email) WHERE email IS NOT NULL;
```

## Error Handling

### Common Errors:
- **Invalid email**: "Valid email address is required"
- **Rate limit**: "Please wait 30 seconds before requesting a new OTP"
- **Invalid OTP**: "Invalid OTP" (max 3 attempts)
- **Expired OTP**: "OTP expired or not found"
- **Duplicate phone**: "User with this phone number already exists"
- **Duplicate email**: "User with this email already exists"

## Migration Steps

### To Deploy:
1. Run database migration:
   ```bash
   cd backend
   node src/database/migrate-email-otp.js
   ```

2. Restart backend server:
   ```bash
   npm start
   ```

3. Frontend automatically uses new login page

### Rollback:
Email OTP is additive - Google OAuth continues to work independently. No rollback needed.

## Comparison: Google OAuth vs Email OTP

| Feature | Google OAuth | Email OTP |
|---------|-------------|-----------|
| Phone Required | Yes | Yes |
| Email Verification | Via Google | Via OTP |
| Password | No | No |
| 2FA Built-in | Yes (Google) | Yes (Email OTP) |
| Social Login | Yes | No |
| Privacy | Shares with Google | Email only |
| Best For | Users with Google accounts | Users preferring email |

## Benefits

1. **User Choice**: Provides alternative to Google OAuth
2. **Privacy**: Email-only option without social login
3. **Accessibility**: Works for users without Google accounts
4. **Security**: OTP-based 2FA authentication
5. **Consistency**: Both methods require phone for delivery
6. **User Experience**: Streamlined multi-step flow

## Future Enhancements

Potential improvements:
- SMS OTP as third option (currently removed)
- Remember device functionality
- Social login with Facebook/Twitter
- Magic link authentication
- Biometric authentication support

## Support

For issues or questions:
- Check backend logs: `backend/logs/`
- Frontend console for errors
- Database migration logs
- API response error messages

---

**Status**: ✅ Fully Implemented and Tested
**Version**: 2.0.0
**Date**: March 2, 2026
