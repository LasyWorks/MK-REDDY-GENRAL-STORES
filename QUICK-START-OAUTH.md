# 🚀 Quick Start Guide - Google OAuth Integration

## ⚡ Immediate Actions Required

### 1. Get Google OAuth Credentials (5 minutes)
```
1. Visit: https://console.cloud.google.com/
2. Create project: "MK Reddy Stores"
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Copy Client ID and Client Secret
```

### 2. Update Environment Variables

**Backend**: `backend/.env`
```bash
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
```

**Frontend**: `frontend/.env.local`
```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
```

### 3. Start Servers
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

### 4. Test Login
```
1. Go to http://localhost:3000/login
2. Click "Sign in with Google"
3. Complete registration with phone number
4. Done! ✅
```

---

## 📋 What Changed

### ✅ Added
- Google OAuth 2.0 authentication
- Phone number collection during registration
- Email verification through Google
- Modern login UI
- User profile pictures from Google
- Secure token-based authentication

### ❌ Removed
- SMS-based OTP login
- Phone-only authentication
- SMS service integration
- OTP verification screens

### ✔️ Kept
- Admin password login
- Email-based OTP for admins
- JWT token system
- All other features unchanged

---

## 🎯 New User Flow

```
User clicks "Sign in with Google"
    ↓
Google authentication
    ↓
[New User] → Provide phone number → Register → Login
[Existing User] → Direct login
```

---

## 📊 API Endpoints Changed

### New Endpoints
- `POST /api/v1/auth/google/login` - Google OAuth login
- `POST /api/v1/auth/google/register` - Complete registration

### Removed Endpoints (Customer)
- ~~POST /api/v1/auth/otp/send~~ (commented out)
- ~~POST /api/v1/auth/otp/verify~~ (commented out)
- ~~POST /api/v1/auth/register~~ (commented out)

### Still Available (Admin)
- `POST /api/v1/auth/admin/login` - Admin password login
- `POST /api/v1/auth/otp/send-by-email` - Email OTP

---

## 🔑 Configuration Files Updated

| File | Changes |
|------|---------|
| `backend/.env` | Added GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET |
| `frontend/.env.local` | Added NEXT_PUBLIC_GOOGLE_CLIENT_ID |
| `backend/src/config/index.js` | Added google OAuth config |
| `backend/src/services/GoogleOAuthService.js` | **NEW** - Token verification |
| `backend/src/services/AuthService.js` | Added OAuth methods |
| `backend/src/controllers/authController.js` | Added OAuth endpoints |
| `backend/src/routes/authRoutes.js` | Updated routes |
| `backend/src/models/User.js` | Added google_id, profile_picture |
| `frontend/app/layout.jsx` | Added GoogleOAuthProvider |
| `frontend/app/login/page.jsx` | Completely rewritten |

---

## 🗄️ Database Changes

```sql
-- New columns added to users table
google_id VARCHAR(255) UNIQUE
profile_picture TEXT
email_verified BOOLEAN DEFAULT FALSE

-- Index created
CREATE INDEX idx_users_google_id ON users(google_id);
```

Migration already executed ✅

---

## 🧪 Testing Steps

1. **New User Registration**
   ```
   ✓ Click "Sign in with Google"
   ✓ Select Google account
   ✓ See phone collection form
   ✓ Enter phone: 9876543210
   ✓ Select type: Retail/Wholesale
   ✓ Submit → Should login successfully
   ```

2. **Existing User Login**
   ```
   ✓ Click "Sign in with Google"
   ✓ Select same Google account
   ✓ Should login immediately (no phone form)
   ```

3. **Error Handling**
   ```
   ✓ Try without Google client ID → Should show error
   ✓ Try with invalid phone → Should show validation
   ✓ Try duplicate phone → Should show error
   ```

---

## 🆘 Common Issues

### Issue: Google button not showing
**Solution:** 
- Check `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in frontend/.env.local
- Restart frontend server: `npm run dev`

### Issue: "Invalid Google token"
**Solution:**
- Verify Client ID matches in backend and frontend
- Check Google Cloud Console authorized domains

### Issue: Database error on registration
**Solution:**
- Run migration: `node backend/src/database/migrate-google-oauth.js`
- Check database connection

---

## 📞 Support

- **Setup Guide**: See `GOOGLE-OAUTH-SETUP.md`
- **Code Location**: 
  - Backend: `backend/src/services/GoogleOAuthService.js`
  - Frontend: `frontend/app/login/page.jsx`
- **Old Code**: Backed up in `frontend/app/login/page-old-sms.jsx`

---

**Status**: ✅ **READY TO USE** (after adding Google credentials)
