const logger = require('../utils/logger');
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  logger.info(`Incoming Request`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
  });
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    logger[logLevel](`Response Sent`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
    });
  });
  next();
};
module.exports = requestLogger;