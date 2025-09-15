import { logger } from '../utils/logger';
import { configManager } from './config-manager';

/**
 * Cache Manager
 * In-memory cache with TTL support
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
  hits: number;
}

export class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number = 300000; // 5 minutes
  private maxSize: number = 1000;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.cache = new Map();
    this.startCleanup();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Get cached value
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count
    entry.hits++;

    logger.debug(`Cache hit for key: ${key}`);
    return entry.data as T;
  }

  /**
   * Set cached value
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Check cache size limit
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const expiry = Date.now() + (ttl || this.defaultTTL);

    this.cache.set(key, {
      data,
      expiry,
      hits: 0,
    });

    logger.debug(`Cached key: ${key}, TTL: ${ttl || this.defaultTTL}ms`);
  }

  /**
   * Delete cached value
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear specific pattern
   */
  clearPattern(pattern: string): number {
    const regex = new RegExp(pattern);
    let cleared = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        cleared++;
      }
    }

    logger.info(`Cleared ${cleared} cache entries matching pattern: ${pattern}`);
    return cleared;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info(`Cleared ${size} cache entries`);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    memoryUsage: number;
  } {
    let totalHits = 0;
    let totalRequests = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      totalRequests += entry.hits + 1;
    }

    const hitRate = totalRequests > 0 ? totalHits / totalRequests : 0;

    // Estimate memory usage
    const memoryUsage = this.estimateMemoryUsage();

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate,
      memoryUsage,
    };
  }

  /**
   * Cache wrapper for async functions
   */
  async cached<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Check cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    try {
      const result = await fn();
      this.set(key, result, ttl);
      return result;
    } catch (error) {
      logger.error(`Failed to cache key: ${key}`, error);
      throw error;
    }
  }

  /**
   * Decorator for caching method results
   */
  static cache(ttl?: number) {
    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;
      const cacheManager = CacheManager.getInstance();

      descriptor.value = async function (...args: any[]) {
        const cacheKey = `${target.constructor.name}.${propertyKey}:${JSON.stringify(args)}`;

        return cacheManager.cached(
          cacheKey,
          () => originalMethod.apply(this, args),
          ttl
        );
      };

      return descriptor;
    };
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let minHits = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < minHits) {
        minHits = entry.hits;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      logger.debug(`Evicted LRU cache entry: ${lruKey}`);
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    // Only run cleanup in production
    if (!configManager.isProduction()) {
      return;
    }

    // Cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      // Rough estimation
      totalSize += key.length * 2; // Key string
      totalSize += JSON.stringify(entry.data).length * 2; // Data
      totalSize += 24; // Entry overhead
    }

    return totalSize;
  }

  /**
   * Stop cleanup interval
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();

// Export cache decorator
export const cache = CacheManager.cache;