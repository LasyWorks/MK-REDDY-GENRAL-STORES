const axios = require('axios');
const logger = require('./logger');
const GOOGLE_TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single';
async function translateToTelugu(text) {
  if (!text || typeof text !== 'string' || !text.trim()) return text;
  try {
    const { data } = await axios.get(GOOGLE_TRANSLATE_URL, {
      params: {
        client: 'gtx',
        sl: 'en',
        tl: 'te',
        dt: 't',
        q: text,
      },
      timeout: 5000,
    });
    if (data && data[0] && data[0].length > 0) {
      const translated = data[0].map(segment => segment[0]).join('');
      return translated || text;
    }
    return text;
  } catch (err) {
    logger.warn(`Telugu translation failed for "${text.substring(0, 50)}...": ${err.message}`);
    return text; 
  }
}
async function translateProductFields(name, description) {
  const [name_te, description_te] = await Promise.all([
    name ? translateToTelugu(name) : Promise.resolve(null),
    description ? translateToTelugu(description) : Promise.resolve(null),
  ]);
  return { name_te, description_te };
}
module.exports = { translateToTelugu, translateProductFields };