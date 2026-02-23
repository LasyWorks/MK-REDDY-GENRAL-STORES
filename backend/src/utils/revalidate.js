/**
 * revalidate.js
 *
 * Pings the Next.js On-Demand ISR endpoint so the frontend immediately
 * discards stale cached pages and regenerates them.
 *
 * This is a fire-and-forget utility — a failure here is non-fatal.
 * The page will eventually refresh on its own via the time-based fallback.
 *
 * Usage:
 *   const { revalidatePages } = require('../utils/revalidate');
 *
 *   // Invalidate by cache tag (preferred — targets multiple pages at once)
 *   await revalidatePages({ tags: ['categories', 'category-<id>'] });
 *
 *   // Invalidate by exact path (use in addition to tags for instant rebuild)
 *   await revalidatePages({ tags: ['categories'], paths: ['/categories'] });
 */

const logger = require('./logger');

/**
 * @param {object} options
 * @param {string[]} [options.tags]   - Cache tags to invalidate
 * @param {string[]} [options.paths]  - Exact paths to revalidate
 */
const revalidatePages = async ({ tags = [], paths = [] } = {}) => {
  const frontendUrl = process.env.FRONTEND_URL;
  const secret = process.env.REVALIDATION_SECRET;

  // Skip silently if not configured (e.g. running tests without frontend)
  if (!frontendUrl || !secret) {
    return;
  }

  try {
    const res = await fetch(`${frontendUrl}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, tags, paths }),
      // Short timeout — don't block the API response waiting for Next.js
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      logger.info(`[ISR] Revalidated — tags: [${tags.join(', ')}] paths: [${paths.join(', ')}]`);
    } else {
      logger.warn(`[ISR] Revalidation returned ${res.status}`);
    }
  } catch (err) {
    // Network error, frontend down, timeout — all non-fatal
    logger.warn(`[ISR] Revalidation ping failed: ${err.message}`);
  }
};

module.exports = { revalidatePages };
