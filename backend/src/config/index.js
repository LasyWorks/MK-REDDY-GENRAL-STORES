require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5001,
  apiVersion: process.env.API_VERSION || 'v1',
  database: {
    host:            process.env.DB_HOST     || 'localhost',
    port:            parseInt(process.env.DB_PORT, 10) || 5432,
    user:            process.env.DB_USER     || 'postgres',
    password:        process.env.DB_PASSWORD || '',
    name:            process.env.DB_NAME     || 'mk_kirana_stores',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
    ssl: process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: false }
      : false,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5,
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS, 10) || 3,
    resendCooldownSeconds: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS, 10) || 60,
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    otpWindowMs: parseInt(process.env.OTP_RATE_LIMIT_WINDOW_MS, 10) || 60000,
    otpMaxRequests: parseInt(process.env.OTP_RATE_LIMIT_MAX_REQUESTS, 10) || 3,
  },
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || '',
    adminEmail: process.env.ADMIN_EMAIL || '',
  },
  store: {
    name: process.env.STORE_NAME || 'MK Kirrana Stores',
    gstNumber: process.env.STORE_GST_NUMBER || '',
    address: process.env.STORE_ADDRESS || '',
    phone: process.env.STORE_PHONE || '',
    email: process.env.STORE_EMAIL || '',
  },
  limits: {
    maxCustomers: parseInt(process.env.MAX_CUSTOMERS, 10) || 50,
    maxProducts: parseInt(process.env.MAX_PRODUCTS, 10) || 500,
    retailCustomerMaxQuantity: parseInt(process.env.RETAIL_MAX_QUANTITY, 10) || 10,
    wholesaleCustomerMaxQuantity: parseInt(process.env.WHOLESALE_MAX_QUANTITY, 10) || 100,
  },
  defaultLanguage: process.env.DEFAULT_LANGUAGE || 'en',
  supportedLanguages: ['en', 'te'],
  gstRates: {
    cookingOils: 5,
    default: 18,
  },
  fast2sms: {
    apiKey:    process.env.FAST2SMS_API_KEY    || '',
    senderId:  process.env.FAST2SMS_SENDER_ID  || '',
    route:     process.env.FAST2SMS_ROUTE      || 'dlt',
    messageId: process.env.FAST2SMS_MESSAGE_ID || '',
  },
  whatsapp: {
    provider:    process.env.WA_PROVIDER     || 'twilio', 
    accountSid:  process.env.TWILIO_ACCOUNT_SID  || '',
    authToken:   process.env.TWILIO_AUTH_TOKEN    || '',
    fromNumber:  process.env.WA_FROM_NUMBER       || '',  
    apiKey:      process.env.WA_360_API_KEY        || '',
    namespace:   process.env.WA_360_NAMESPACE      || '',
  },
  cors: {
    origin: (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*')
      ? process.env.CORS_ORIGIN
      : (process.env.FRONTEND_URL || 'http://localhost:3000'),
    credentials: true,
  },
};

if (!config.jwt.secret || !config.jwt.refreshSecret) {
  throw new Error('CRITICAL: JWT_SECRET and JWT_REFRESH_SECRET must be set in environment variables');
}

if (config.jwt.secret.includes('default') || config.jwt.refreshSecret.includes('default')) {
  throw new Error('CRITICAL: Default JWT secrets detected. Generate secure secrets immediately');
}

if (!config.cors.origin) {
  throw new Error('CRITICAL: CORS_ORIGIN must be explicitly set (use specific domain, not wildcard)');
}

if (config.env === 'production') {
  const requiredEnvVars = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'DB_PASSWORD',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'STORE_GST_NUMBER',
    'FAST2SMS_API_KEY',
    'CORS_ORIGIN',
  ];
  requiredEnvVars.forEach((envVar) => {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  });
}
module.exports = config;
