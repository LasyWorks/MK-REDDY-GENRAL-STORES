/**
 * Auto-translate English text to Telugu using Google Translate (free endpoint).
 * Falls back gracefully — if translation fails, returns the original English text
 * so product/category creation is never blocked.
 */
const axios = require('axios');
const logger = require('./logger');

const GOOGLE_TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single';

/**
 * Translate a single string from English to Telugu.
 * @param {string} text - English text to translate
 * @returns {Promise<string>} Telugu translation (or original text on failure)
 */
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

    // Response shape: [[["translated text","original text",null,null,10]],null,"en"]
    if (data && data[0] && data[0].length > 0) {
      const translated = data[0].map(segment => segment[0]).join('');
      return translated || text;
    }
    return text;
  } catch (err) {
    logger.warn(`Telugu translation failed for "${text.substring(0, 50)}...": ${err.message}`);
    return text; // graceful fallback — never block the operation
  }
}

/**
 * Translate name + description together (batches to reduce API calls).
 * @param {string|null} name  - English name
 * @param {string|null} description - English description
 * @returns {Promise<{name_te: string|null, description_te: string|null}>}
 */
async function translateProductFields(name, description) {
  const [name_te, description_te] = await Promise.all([
    name ? translateToTelugu(name) : Promise.resolve(null),
    description ? translateToTelugu(description) : Promise.resolve(null),
  ]);
  return { name_te, description_te };
}

module.exports = { translateToTelugu, translateProductFields };
