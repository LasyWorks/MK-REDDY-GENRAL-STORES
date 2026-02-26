const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const xssClean = require('xss-clean');
const config = require('./config');
const routes = require('./routes');
const { errorHandler, requestLogger, languageMiddleware, apiLimiter } = require('./middlewares');
const logger = require('./utils/logger');
const app = express();
app.set('trust proxy', 1);
if (config.env === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: config.cors.origin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400, 
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
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
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