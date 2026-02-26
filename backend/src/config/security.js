/**
 * Security Configuration and Constants
 * Centralized security settings to ensure consistency across the application
 */

const config = {
  // Password Security
  password: {
    bcryptRounds: 12, // Increased from 10 for better security (OWASP recommendation 2024)
    minLength: 8,
    requireNumbers: true,
    requireSpecialChars: true,
    requireUppercase: true,
  },

  // Account Lockout (Brute Force Protection)
  accountLockout: {
    enabled: true,
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 30,
    resetSuccessfulLogin: true,
  },

  // Refresh Token Rotation
  refreshToken: {
    rotationEnabled: true,
    gracePeriodSeconds: 60, // Allow old token for 60s during rotation
    maxDevices: 5, // Maximum concurrent sessions per user
  },

  // JWT Revocation
  jwtRevocation: {
    revokeOnPasswordChange: true,
    revokeOnEmailChange: true,
    revokeOnRoleChange: true,
  },

  // Upload Security
  uploads: {
    requireAuth: true,
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    allowedExcelTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    maxImageSize: 2 * 1024 * 1024, // 2MB
    maxExcelSize: 5 * 1024 * 1024, // 5MB
    virusScanEnabled: false, // Set true if ClamAV is installed
  },

  // Redirect Security
  redirect: {
    allowedHosts: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      process.env.ADMIN_URL || 'http://localhost:3001',
    ],
    strictMode: true,
  },

  // Revalidation Security
  revalidation: {
    requireSignature: true,
    signatureSecret: process.env.REVALIDATION_SECRET || 'change-this-secret',
    allowedIPs: ['127.0.0.1', '::1'], // Add your server IPs
  },

  // Database Security
  database: {
    enableMonitoring: true,
    slowQueryThreshold: 1000, // ms
    connectionTimeout: 10000, // 10s
    maxRetries: 3,
  },

  // Helmet CSP Configuration
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Consider removing unsafe-inline in production
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'", 'blob:'],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },

  // Security Headers
  securityHeaders: {
    hidePoweredBy: true,
    strictTransportSecurity: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    contentSecurityPolicy: true,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
  },

  // Audit Logging
  auditLog: {
    enableAdminActions: true,
    enableAuthEvents: true,
    enableDataChanges: true,
    retentionDays: 90,
    alertOnSuspiciousActivity: true,
  },

  // Real-time Alerting
  alerts: {
    enabled: true,
    channels: ['email', 'log'], // Add 'slack', 'webhook' as needed
    events: [
      'MULTIPLE_FAILED_LOGINS',
      'ACCOUNT_LOCKED',
      'ADMIN_PASSWORD_CHANGE',
      'ROLE_CHANGE',
      'DATA_EXPORT',
      'SQL_INJECTION_ATTEMPT',
      'XSS_ATTEMPT',
      'RATE_LIMIT_EXCEEDED',
    ],
  },
};

// Validation
if (config.revalidation.requireSignature && config.revalidation.signatureSecret.includes('change-this')) {
  console.warn('⚠️  WARNING: Default revalidation secret detected. Set REVALIDATION_SECRET in environment.');
}

module.exports = config;
