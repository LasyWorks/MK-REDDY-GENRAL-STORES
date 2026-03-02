const NodeCache = require('node-cache');
const logger = require('./logger');

/**
 * CacheService - In-memory caching layer for frequently accessed data
 * Reduces database load and improves response times
 */
class CacheService {
  constructor() {
    // Create multiple cache instances for different data types
    this.caches = {
      // Product data - 5 min TTL
      products: new NodeCache({ 
        stdTTL: 300, 
        checkperiod: 60,
        useClones: false // Performance: don't clone objects
      }),
      
      // Category data - 10 min TTL (changes less frequently)
      categories: new NodeCache({ 
        stdTTL: 600, 
        checkperiod: 120,
        useClones: false
      }),
      
      // Promotion data - 5 min TTL
      promotions: new NodeCache({ 
        stdTTL: 300, 
        checkperiod: 60,
        useClones: false
      }),
      
      // User data - 15 min TTL
      users: new NodeCache({ 
        stdTTL: 900, 
        checkperiod: 180,
        useClones: false
      }),
      
      // Query results - 2 min TTL (for generic queries)
      queries: new NodeCache({ 
        stdTTL: 120, 
        checkperiod: 30,
        useClones: false
      }),
      
      // API responses - 1 min TTL (for complete API responses)
      responses: new NodeCache({ 
        stdTTL: 60, 
        checkperiod: 15,
        useClones: false
      })
    };

    // Track cache stats
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };

    // Setup event listeners for monitoring
    Object.keys(this.caches).forEach(cacheName => {
      const cache = this.caches[cacheName];
      
      cache.on('set', (key, value) => {
        this.stats.sets++;
        logger.debug(`Cache SET [${cacheName}]: ${key}`);
      });
      
      cache.on('del', (key, value) => {
        this.stats.deletes++;
        logger.debug(`Cache DEL [${cacheName}]: ${key}`);
      });
      
      cache.on('expired', (key, value) => {
        logger.debug(`Cache EXPIRED [${cacheName}]: ${key}`);
      });
    });
  }

  /**
   * Get value from cache
   */
  get(cacheType, key) {
    const cache = this.caches[cacheType];
    if (!cache) {
      logger.warn(`Invalid cache type: ${cacheType}`);
      return null;
    }

    const value = cache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
      logger.debug(`Cache HIT [${cacheType}]: ${key}`);
      return value;
    }
    
    this.stats.misses++;
    logger.debug(`Cache MISS [${cacheType}]: ${key}`);
    return null;
  }

  /**
   * Set value in cache
   */
  set(cacheType, key, value, ttl) {
    const cache = this.caches[cacheType];
    if (!cache) {
      logger.warn(`Invalid cache type: ${cacheType}`);
      return false;
    }

    return cache.set(key, value, ttl);
  }

  /**
   * Delete specific key from cache
   */
  del(cacheType, key) {
    const cache = this.caches[cacheType];
    if (!cache) {
      logger.warn(`Invalid cache type: ${cacheType}`);
      return false;
    }

    return cache.del(key);
  }

  /**
   * Delete multiple keys matching pattern
   */
  delPattern(cacheType, pattern) {
    const cache = this.caches[cacheType];
    if (!cache) {
      logger.warn(`Invalid cache type: ${cacheType}`);
      return 0;
    }

    const keys = cache.keys();
    const matchingKeys = keys.filter(key => key.includes(pattern));
    return cache.del(matchingKeys);
  }

  /**
   * Clear entire cache type
   */
  flush(cacheType) {
    if (cacheType === 'all') {
      Object.values(this.caches).forEach(cache => cache.flushAll());
      logger.info('All caches flushed');
      return true;
    }

    const cache = this.caches[cacheType];
    if (!cache) {
      logger.warn(`Invalid cache type: ${cacheType}`);
      return false;
    }

    cache.flushAll();
    logger.info(`Cache flushed: ${cacheType}`);
    return true;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const cacheStats = {};
    
    Object.keys(this.caches).forEach(cacheName => {
      const cache = this.caches[cacheName];
      cacheStats[cacheName] = {
        keys: cache.keys().length,
        hits: cache.getStats().hits,
        misses: cache.getStats().misses,
        ksize: cache.getStats().ksize,
        vsize: cache.getStats().vsize
      };
    });

    return {
      global: this.stats,
      caches: cacheStats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  /**
   * Wrap async function with caching
   * Usage: const result = await cache.wrap('products', 'product-123', () => fetchProduct(123));
   */
  async wrap(cacheType, key, fetchFn, ttl) {
    // Try to get from cache first
    const cached = this.get(cacheType, key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch the data
    const data = await fetchFn();
    
    // Store in cache
    if (data !== null && data !== undefined) {
      this.set(cacheType, key, data, ttl);
    }

    return data;
  }
}

// Export singleton instance
module.exports = new CacheService();
