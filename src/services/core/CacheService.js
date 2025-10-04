/**
 * UNIFIED CACHE SERVICE
 * 
 * Centralized caching for performance optimization
 * Consolidates caching logic from multiple services
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
    this.defaultTTL = 300000; // 5 minutes
    this.maxSize = 1000; // Maximum number of cached items
  }

  set(key, value, ttl = this.defaultTTL) {
    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });

    // Set expiration timer
    if (ttl > 0) {
      const timer = setTimeout(() => {
        this.delete(key);
      }, ttl);
      
      this.timers.set(key, timer);
    }
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    // Check if expired
    if (item.ttl > 0 && Date.now() - item.timestamp > item.ttl) {
      this.delete(key);
      return null;
    }
    
    return item.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    this.cache.delete(key);
    
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  clear() {
    this.cache.clear();
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }

  size() {
    return this.cache.size;
  }

  // Utility methods
  memoize(fn, keyFn, ttl = this.defaultTTL) {
    return (...args) => {
      const key = keyFn ? keyFn(...args) : JSON.stringify(args);
      
      if (this.has(key)) {
        return this.get(key);
      }
      
      const result = fn(...args);
      this.set(key, result, ttl);
      return result;
    };
  }

  async memoizeAsync(fn, keyFn, ttl = this.defaultTTL) {
    return async (...args) => {
      const key = keyFn ? keyFn(...args) : JSON.stringify(args);
      
      if (this.has(key)) {
        return this.get(key);
      }
      
      const result = await fn(...args);
      this.set(key, result, ttl);
      return result;
    };
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      activeTimers: this.timers.size
    };
  }
}

const cacheService = new CacheService();
export default cacheService;