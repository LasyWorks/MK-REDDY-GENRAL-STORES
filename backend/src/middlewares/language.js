const config = require('../config');

/**
 * Language middleware - extracts language preference from request
 */
const languageMiddleware = (req, res, next) => {
  // Check query parameter first, then header, then default
  const lang = req.query.lang || 
               req.headers['accept-language']?.split(',')[0]?.split('-')[0] ||
               config.defaultLanguage;

  // Validate language
  req.language = config.supportedLanguages.includes(lang) ? lang : config.defaultLanguage;

  next();
};

module.exports = languageMiddleware;
