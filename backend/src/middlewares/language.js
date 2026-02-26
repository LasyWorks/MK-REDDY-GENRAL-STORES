const config = require('../config');
const languageMiddleware = (req, res, next) => {
  const lang = req.query.lang || 
               req.headers['accept-language']?.split(',')[0]?.split('-')[0] ||
               config.defaultLanguage;
  req.language = config.supportedLanguages.includes(lang) ? lang : config.defaultLanguage;
  next();
};
module.exports = languageMiddleware;