# Google OAuth 2.0 Setup Guide

## Overview
The application now uses **Google OAuth 2.0** as the primary authentication method, replacing SMS/OTP-based login. Users sign in with their Google account and provide a phone number during registration for order notifications.

## ✅ What's Been Completed

### Backend Changes
1. ✅ Installed `google-auth-library` package
2. ✅ Created `GoogleOAuthService` for token verification
3. ✅ Added Google OAuth methods to `AuthService`:
   - `googleLogin(idToken, ipAddress)` - Verify Google token and login/register
   - `completeGoogleRegistration(userData)` - Complete registration with phone number
4. ✅ Updated `authController` with new endpoints:
   - `POST /auth/google/login` - Google OAuth login
   - `POST /auth/google/register` - Complete registration
5. ✅ Removed SMS-based OTP routes (commented out)
6. ✅ Updated User model to support:
   - `google_id` (unique Google user ID)
   - `profile_picture` (Google profile image URL)
   - `email_verified` (email verification status)
7. ✅ Database migration completed successfully

### Frontend Changes
1. ✅ Installed `@react-oauth/google` package
2. ✅ Added `GoogleOAuthProvider` to app layout
3. ✅ Completely rewrote login page with:
   - Google Sign-In button
   - Phone number collection flow
   - User type selection (Retail/Wholesale)
   - Address input (optional)
   - Progress indicator
4. ✅ Backed up old SMS-based login page to `page-old-sms.jsx`

## 🔧 Configuration Required

### Step 1: Create Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create or Select a Project**
   - Click "Select a project" → "New Project"
   - Name: "MK Reddy Stores" (or similar)
   - Click "Create"

3. **Enable Google+ API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" → "OAuth consent screen"
   - Select "External" (unless you have Google Workspace)
   - Click "Create"
   - Fill in:
     - App name: "MK Reddy General Stores"
     - User support email: Your email
     - Developer contact: Your email
   - Click "Save and Continue"
   - Scopes: Skip for now (Click "Save and Continue")
   - Test users: Add your email for testing
   - Click "Save and Continue"

5. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "MK Reddy Stores Web Client"
   - Authorized JavaScript origins:
     - `http://localhost:3000` (development)
     - `https://yourdomain.com` (production)
   - Authorized redirect URIs:
     - `http://localhost:3000` (development)
     - `https://yourdomain.com` (production)
   - Click "Create"
   - **Copy the Client ID and Client Secret**

### Step 2: Update Environment Variables

#### Backend (.env)
```bash
# Add these lines to backend/.env
GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# The rest remains the same
CORS_ORIGIN=http://localhost:3000
```

#### Frontend (.env.local)
```bash
# Update this line in frontend/.env.local
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
```

### Step 3: Test the Integration

1. **Start Backend Server**
   ```bash
   cd backend
   npm start
   ```

2. **Start Frontend Server**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test Login Flow**
   - Visit: http://localhost:3000/login
   - Click "Sign in with Google"
   - Select your Google account
   - For new users: Complete phone number registration
   - For existing users: Direct login

## 🔐 Security Features

### Backend Security
- ✅ Google ID token verification using official Google library
- ✅ Email verification enforced (must be verified by Google)
- ✅ JWT token generation after successful authentication
- ✅ Refresh token rotation supported
- ✅ Account lockout for admin password-based login
- ✅ IP address logging for security audits
- ✅ Rate limiting on authentication endpoints

### Frontend Security
- ✅ Secure token storage using `secureStorage` utility
- ✅ OAuth 2.0 standard compliance
- ✅ No passwords stored on client side
- ✅ Automatic redirect after authentication
- ✅ CSRF protection via Google's security mechanisms

## 📱 User Flow

### New User Registration
1. User clicks "Sign in with Google"
2. Google authentication popup appears
3. User signs in with Google
4. Backend verifies token → User doesn't exist
5. Frontend shows phone number collection form
6. User enters:
   - Phone number (required)
   - Name (pre-filled from Google, editable)
   - Customer type (Retail/Wholesale)
   - Address (optional)
7. Registration completes → User logged in

### Existing User Login
1. User clicks "Sign in with Google"
2. Google authentication popup appears
3. User signs in with Google
4. Backend verifies token → User exists
5. User immediately logged in
6. Redirect to requested page

## 🗑️ What Was Removed

### Backend
- ❌ SMS-based OTP sending (`sendOTP` using SMS service)
- ❌ Phone-based OTP verification for customers
- ❌ Customer registration without email
- ❌ Routes: `/auth/otp/send`, `/auth/otp/verify`, `/auth/register` (commented out)

### Frontend
- ❌ Phone number input on login screen
- ❌ OTP input screen
- ❌ SMS-based verification flow
- ❌ Resend OTP functionality
- ❌ OTP countdown timer

### What's Kept
- ✅ Admin email-based OTP login (for admin panel)
- ✅ Email-based OTP for password recovery
- ✅ Admin password-based login

## 🎨 UI Improvements

### New Login Page Features
- Modern, clean Google Sign-In button
- Three-step progress indicator
- Responsive design for all screen sizes
- Loading states and error handling
- Success messages with smooth transitions
- Security badge highlighting OAuth 2.0
- Terms & Privacy links
- Help/support link

## 📊 Database Schema Changes

### Users Table - New Columns
```sql
google_id VARCHAR(255) UNIQUE          -- Google user ID (indexed)
profile_picture TEXT                   -- URL to Google profile picture
email_verified BOOLEAN DEFAULT FALSE   -- Email verification status
```

## 🧪 Testing Checklist

- [ ] Google Sign-In button appears on login page
- [ ] Clicking Google button opens Google authentication
- [ ] New user flow: Phone number collection form appears
- [ ] New user flow: Registration completes successfully
- [ ] Existing user flow: Direct login works
- [ ] Token storage in secureStorage works
- [ ] Redirect to original page works
- [ ] Error messages display correctly
- [ ] Mobile responsive design works
- [ ] Admin login still works (password-based)

## 🚀 Production Deployment

### Before Going Live
1. Update Google OAuth authorized domains in Google Cloud Console
2. Add production domain to Authorized JavaScript origins
3. Add production domain to Authorized redirect URIs
4. Update environment variables on production server
5. Test thoroughly in production environment
6. Monitor logs for any authentication errors

### Environment Variables for Production
```bash
# Backend
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-client-secret
CORS_ORIGIN=https://your-production-domain.com

# Frontend
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-production-client-id
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api/v1
```

## 📝 Notes

- Old login page backed up as `frontend/app/login/page-old-sms.jsx`
- SMS service code remains in codebase but unused
- Admin authentication still uses password + optional email OTP
- Phone number is mandatory for all customer accounts
- Email is mandatory (provided by Google)
- User can't proceed without providing phone number

## 🆘 Troubleshooting

### "Google OAuth is not configured" error
- Check if `GOOGLE_CLIENT_ID` is set in backend `.env`
- Restart backend server after updating environment variables

### Google Sign-In button not appearing
- Check if `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set in frontend `.env.local`
- Restart frontend dev server
- Clear browser cache

### "Invalid Google token" error
- Verify Client ID matches between frontend and backend
- Check if Google+ API is enabled in Google Cloud Console
- Ensure authorized domains are configured correctly

### Database error on registration
- Ensure migration ran successfully
- Check database connection
- Verify `google_id` column exists in `users` table

## 📧 Support

For issues or questions, contact the development team or refer to:
- Google OAuth 2.0 Documentation: https://developers.google.com/identity/protocols/oauth2
- React OAuth Library: https://github.com/MomenSherif/react-oauth

---

**Implementation Date:** March 2, 2026
**Status:** ✅ Complete - Ready for configuration and testing
