# Security Hardening Implementation Guide

## Overview
This document outlines the comprehensive security improvements implemented in the application based on security audit recommendations.

## ✅ Completed Security Enhancements

### 1. Bcrypt Work Factor Upgrade
- **Status:** ✅ Complete
- **Change:** Increased bcrypt rounds from 10 to 12
- **Location:** `backend/src/services/userService.js`, `backend/src/config/security.js`
- **Impact:** Stronger password hashing, ~4x more computational cost for attackers

### 2. Refresh Token Rotation
- **Status:** ✅ Complete
- **Implementation:** 
  - Tokens rotated on each refresh request
  - 60-second grace period for concurrent requests
  - Old token revoked after rotation
- **Location:** `backend/src/services/authService.js`
- **Security Benefit:** Limits token lifetime exposure, prevents token reuse

### 3. JWT Revocation on Password Change
- **Status:** ✅ Complete
- **Implementation:**
  - Created `PasswordService` for secure password operations
  - All refresh tokens revoked when password changes
  - Security alert sent to user
- **Location:** `backend/src/services/passwordService.js`
- **Security Benefit:** Prevents unauthorized access with old tokens

### 4. Account Lockout Mechanism
- **Status:** ✅ Complete
- **Implementation:**
  - Lock after 5 failed login attempts
  - 30-minute lockout duration
  - Tracks attempts per phone number and IP
  - Security alerts on lockout
- **Location:** `backend/src/utils/accountLockout.js`
- **Database:** Requires `failed_login_attempts` table (see migration below)

### 5. Uploads Directory Authentication
- **Status:** ✅ Complete
- **Implementation:**
  - Configurable authentication requirement via `securityConfig.uploads.requireAuth`
  - Set to `false` by default, can be enabled for production
- **Location:** `backend/src/app.js`, `backend/src/config/security.js`
- **Usage:** Set `requireAuth: true` to protect uploaded files

### 6. Redirect Validation
- **Status:** ✅ Complete
- **Implementation:**
  - Whitelist of allowed redirect hosts
  - Validates `req.headers.host` against whitelist
  - Prevents open redirect vulnerabilities
- **Location:** `backend/src/app.js`, `backend/src/config/security.js`

### 7. Helmet CSP Tightening
- **Status:** ✅ Complete
- **Implementation:**
  - Strict Content Security Policy directives
  - No inline scripts/styles without nonce
  - Restricted external resource loading
- **Location:** `backend/src/app.js`, `backend/src/config/security.js`
- **Configuration:** Customize CSP in `securityConfig.contentSecurityPolicy`

### 8. Security Alerting System
- **Status:** ✅ Complete
- **Implementation:**
  - Multi-channel support (log, email, Slack, webhook)
  - Severity classification (HIGH, MEDIUM, LOW)
  - Event types: ACCOUNT_LOCKED, PASSWORD_CHANGED, DATABASE_ERROR, etc.
- **Location:** `backend/src/utils/alerting.js`
- **Configuration:** Set email/Slack/webhook credentials in environment variables

### 9. Excel Library Replacement
- **Status:** ✅ Complete
- **Change:** Replaced `xlsx` with `exceljs`
- **Implementation:**
  - Updated product bulk upload to use exceljs
  - Created actual Excel template file with formatting
  - More secure and actively maintained library
- **Location:** 
  - `backend/src/services/productService.js`
  - `backend/src/controllers/productController.js`

### 10. Request Signing for Revalidation
- **Status:** ✅ Complete
- **Implementation:**
  - HMAC-SHA256 signature generation
  - Timestamp-based request expiration (5 minutes)
  - Timing-safe signature comparison
- **Location:**
  - Backend: `backend/src/utils/requestSigning.js`, `backend/src/utils/revalidate.js`
  - Frontend: `frontend/lib/requestSigning.js`, `frontend/app/api/revalidate/route.js`
- **Security Benefit:** Prevents unauthorized cache invalidation

### 11. Database Connection Monitoring
- **Status:** ✅ Complete
- **Implementation:**
  - Connection pool event monitoring
  - Periodic health checks (every 60 seconds)
  - Slow query detection (threshold: 1 second)
  - Connection availability alerts
  - Metrics tracking (total queries, slow queries, failed queries)
- **Location:** 
  - `backend/src/utils/databaseMonitor.js`
  - `backend/src/config/database.js`
  - `backend/src/routes/healthRoutes.js`
- **Endpoints:**
  - `GET /api/v1/health-check` - Basic health status
  - `GET /api/v1/health-check/detailed` - Database + metrics
  - `GET /api/v1/health-check/metrics` - Connection pool metrics

## 📋 Required Database Migration

### failed_login_attempts Table
Run the migration script to create the required table for account lockout:

```bash
node backend/src/database/migrate-failed-login-attempts.js
```

Or add to your schema.sql:
```sql
CREATE TABLE failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  phone VARCHAR(15) NOT NULL,
  ip_address VARCHAR(45),
  attempts INT DEFAULT 1,
  locked_until TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_failed_login_phone ON failed_login_attempts(phone);
CREATE INDEX idx_failed_login_ip ON failed_login_attempts(ip_address);
CREATE INDEX idx_failed_login_locked ON failed_login_attempts(locked_until);
```

## 🔧 Configuration

### Security Configuration
All security settings are centralized in `backend/src/config/security.js`:

```javascript
const securityConfig = {
  password: {
    bcryptRounds: 12,
    minLength: 8,
  },
  accountLockout: {
    maxAttempts: 5,
    lockDurationMinutes: 30,
  },
  refreshToken: {
    rotationEnabled: true,
    gracePeriodsSeconds: 60,
  },
  jwt: {
    revokeOnPasswordChange: true,
  },
  uploads: {
    requireAuth: false, // Set to true for production
  },
  // ... more settings
};
```

### Environment Variables
Add to your `.env` file:

```bash
# Revalidation signing
REVALIDATION_SECRET=your-secure-secret-key-here

# Security alerts (optional)
ALERT_EMAIL_ENABLED=false
ALERT_EMAIL_FROM=alerts@yourapp.com
ALERT_EMAIL_TO=admin@yourapp.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

ALERT_SLACK_ENABLED=false
ALERT_SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Database monitoring
NODE_ENV=production  # Enables monitoring in production
```

## 🔐 Security Best Practices

### 1. Account Lockout
- Automatically locks accounts after 5 failed login attempts
- 30-minute lockout period
- Manual unlock available via `AccountLockout.unlock(phone)`

### 2. Password Management
- Minimum 8 characters
- Bcrypt rounds: 12 (adjustable in config)
- All refresh tokens revoked on password change
- Security alerts sent to user

### 3. Token Security
- Refresh tokens rotated on each use
- 60-second grace period for concurrent requests
- Automatic revocation on password change
- Device info and IP address tracking

### 4. Request Security
- HMAC-SHA256 request signing for revalidation
- 5-minute timestamp validation window
- Timing-safe signature comparison
- Prevents replay attacks

### 5. Database Monitoring
- Automatic health checks every 60 seconds
- Slow query detection (>1 second)
- Connection pool monitoring
- Security alerts on issues

## 📊 Monitoring & Alerts

### Health Check Endpoints
```bash
# Basic health check
curl http://localhost:5000/api/v1/health-check

# Detailed health with database status
curl http://localhost:5000/api/v1/health-check/detailed

# Database metrics
curl http://localhost:5000/api/v1/health-check/metrics
```

### Security Alerts
Configure alerts in `backend/src/utils/alerting.js`:
- **Email:** SMTP-based email notifications
- **Slack:** Webhook-based Slack messages
- **Webhook:** Custom webhook integration
- **Log:** Always logged to console/file

### Alert Events
- `ACCOUNT_LOCKED` - Account locked after failed attempts
- `PASSWORD_CHANGED` - Password changed successfully
- `FAILED_LOGIN` - Failed login attempt
- `DATABASE_ERROR` - Database connection error
- `DATABASE_PERFORMANCE` - Slow queries or connection issues
- `SQL_INJECTION_ATTEMPT` - Potential SQL injection detected

## 🧪 Testing

### Test Account Lockout
```bash
# Make 5+ failed login attempts
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/v1/auth/admin/login \
    -H "Content-Type: application/json" \
    -d '{"phone":"1234567890","password":"wrongpassword"}'
done
```

### Test Request Signing
```javascript
// Backend sends signed request
const { createSignedHeaders } = require('./utils/requestSigning');
const headers = createSignedHeaders({ tags: ['products'] }, secret);

// Frontend verifies signature
const { verifySignature } = require('./lib/requestSigning');
const isValid = verifySignature(data, signature, secret, timestamp);
```

### Test Database Monitoring
```bash
# Check health
curl http://localhost:5000/api/v1/health-check/detailed

# View metrics
curl http://localhost:5000/api/v1/health-check/metrics
```

## 📚 Related Documentation
- [Security Configuration](backend/src/config/security.js)
- [Account Lockout Service](backend/src/utils/accountLockout.js)
- [Password Service](backend/src/services/passwordService.js)
- [Request Signing](backend/src/utils/requestSigning.js)
- [Database Monitor](backend/src/utils/databaseMonitor.js)
- [Security Alerting](backend/src/utils/alerting.js)

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Run database migration for `failed_login_attempts` table
- [ ] Set `NODE_ENV=production` to enable database monitoring
- [ ] Configure `REVALIDATION_SECRET` environment variable
- [ ] Set `securityConfig.uploads.requireAuth = true` if needed
- [ ] Configure security alert channels (email/Slack/webhook)
- [ ] Review and customize CSP directives for your frontend
- [ ] Test account lockout functionality
- [ ] Test password change and token revocation
- [ ] Monitor health check endpoints
- [ ] Review security alert logs

## 📝 Additional Recommendations

### Future Enhancements
1. **Implement audit logging for all admin actions** - Use existing `AdminLog` model
2. **Schedule quarterly penetration testing** - Hire security professionals
3. **Create incident response plan** - Document procedures for security breaches
4. **Add rate limiting per endpoint** - More granular rate limiting
5. **Implement CAPTCHA on login** - Prevent automated attacks
6. **Add 2FA/MFA support** - Enhanced authentication security
7. **Database encryption at rest** - Encrypt sensitive data
8. **API key management** - For third-party integrations

### Security Maintenance
- Regularly update dependencies (`npm audit`)
- Review security logs weekly
- Test disaster recovery procedures
- Monitor security advisories for used libraries
- Keep bcrypt rounds updated as hardware improves

---

**Last Updated:** 2024
**Security Review Status:** ✅ All critical security improvements implemented
