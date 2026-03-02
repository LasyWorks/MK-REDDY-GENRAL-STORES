const cache = require('../utils/cacheService');
const logger = require('../utils/logger');

// Save API responses so they load faster next time
const cacheMiddleware = (cacheType = 'responses', ttl) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching if user is authenticated (personalized data)
    if (req.user && req.headers.authorization) {
      return next();
    }

    // Generate cache key from URL and query params
    const cacheKey = `${req.originalUrl || req.url}`;

    // Try to get cached response
    const cachedResponse = cache.get(cacheType, cacheKey);
    
    if (cachedResponse) {
      logger.debug(`Serving cached response for: ${cacheKey}`);
      res.set('X-Cache', 'HIT');
      return res.json(cachedResponse);
    }

    // Cache miss - store the original json method
    const originalJson = res.json.bind(res);

    // Override res.json to cache the response before sending
    res.json = (body) => {
      // Only cache successful responses
      if (res.statusCode === 200) {
        cache.set(cacheType, cacheKey, body, ttl);
        logger.debug(`Cached response for: ${cacheKey}`);
      }
      
      res.set('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
};

// Clear saved data when something is updated
const invalidateCache = (cacheType, pattern) => {
  if (pattern) {
    const deleted = cache.delPattern(cacheType, pattern);
    logger.info(`Invalidated ${deleted} cache entries for pattern: ${pattern}`);
  } else {
    cache.flush(cacheType);
    logger.info(`Flushed entire ${cacheType} cache`);
  }
};

// Show how much data is cached
const cacheStats = (req, res) => {
  const stats = cache.getStats();
  res.json({
    success: true,
    data: stats
  });
};

// Delete all cached data
const clearCache = (req, res) => {
  const { type } = req.query;
  
  if (type && type !== 'all') {
    const validTypes = ['products', 'categories', 'promotions', 'users', 'queries', 'responses'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid cache type. Must be one of: ${validTypes.join(', ')}, all`
      });
    }
  }
  
  cache.flush(type || 'all');
  
  res.json({
    success: true,
    message: `Cache cleared: ${type || 'all'}`
  });
};

module.exports = {
  cacheMiddleware,
  invalidateCache,
  cacheStats,
  clearCache,
  cache
};
