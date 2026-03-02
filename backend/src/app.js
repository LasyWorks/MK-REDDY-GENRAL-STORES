const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const xssClean = require('xss-clean');
const compression = require('compression');
const config = require('./config');
const securityConfig = require('./config/security');
const routes = require('./routes');
const { errorHandler, requestLogger, languageMiddleware, apiLimiter, authenticate } = require('./middlewares');
const logger = require('./utils/logger');
const app = express();
app.set('trust proxy', 1);
if (config.env === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
      // Validate redirect host to prevent open redirect vulnerability
      const allowedHosts = securityConfig.redirect.allowedHosts.map(url => new URL(url).host);
      const requestHost = req.headers.host;
      
      if (!allowedHosts.includes(requestHost) && securityConfig.redirect.strictMode) {
        logger.warn(`Blocked redirect to untrusted host: ${requestHost}`);
        return res.status(400).json({ error: 'Invalid host' });
      }
      
      return res.redirect(301, `https://${requestHost}${req.url}`);
    }
    next();
  });
}
// Enhanced Helmet security configuration with strict CSP
app.use(helmet({
  contentSecurityPolicy: securityConfig.contentSecurityPolicy,
  crossOriginEmbedderPolicy: securityConfig.securityHeaders.crossOriginEmbedderPolicy,
  crossOriginOpenerPolicy: securityConfig.securityHeaders.crossOriginOpenerPolicy,
  crossOriginResourcePolicy: securityConfig.securityHeaders.crossOriginResourcePolicy,
  dnsPrefetchControl: securityConfig.securityHeaders.dnsPrefetchControl,
  frameguard: securityConfig.securityHeaders.frameguard,
  hidePoweredBy: securityConfig.securityHeaders.hidePoweredBy,
  hsts: securityConfig.securityHeaders.strictTransportSecurity,
  ieNoOpen: securityConfig.securityHeaders.ieNoOpen,
  noSniff: securityConfig.securityHeaders.noSniff,
  permittedCrossDomainPolicies: securityConfig.securityHeaders.permittedCrossDomainPolicies,
  referrerPolicy: securityConfig.securityHeaders.referrerPolicy,
  xssFilter: securityConfig.securityHeaders.xssFilter,
}));
app.use(cors({
  origin: config.cors.origin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400, 
}));

// Compression middleware - gzip responses for faster transfer
app.use(compression({
  level: 6, // Balance between speed and compression ratio
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression for all responses
    return compression.filter(req, res);
  }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(xssClean());
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(requestLogger);
}
app.use(languageMiddleware);
app.use('/api', apiLimiter);
// Secure uploads directory - require authentication
if (securityConfig.uploads.requireAuth) {
  app.use('/uploads', authenticate, express.static(path.join(__dirname, '../uploads')));
} else {
  // Development only - consider enabling auth in production
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}
app.use('/api/v1', routes);
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'MK Kirana Stores Backend API',
    version: '1.0.0',
    documentation: '/api/v1',
    health: '/api/v1/health',
    store: {
      name: config.store.name,
      location: config.store.address,
    },
  });
});
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    error: {
      code: 'NOT_FOUND',
      status: 404,
    },
  });
});
app.use(errorHandler);
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});
process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});
module.exports = app;
