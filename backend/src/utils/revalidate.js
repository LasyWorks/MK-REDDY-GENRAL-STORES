const logger = require('./logger');
const revalidatePages = async ({ tags = [], paths = [] } = {}) => {
  const frontendUrl = process.env.FRONTEND_URL;
  const secret = process.env.REVALIDATION_SECRET;
  if (!frontendUrl || !secret) {
    return;
  }
  try {
    const res = await fetch(`${frontendUrl}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, tags, paths }),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      logger.info(`[ISR] Revalidated — tags: [${tags.join(', ')}] paths: [${paths.join(', ')}]`);
    } else {
      logger.warn(`[ISR] Revalidation returned ${res.status}`);
    }
  } catch (err) {
    logger.warn(`[ISR] Revalidation ping failed: ${err.message}`);
  }
};
module.exports = { revalidatePages };