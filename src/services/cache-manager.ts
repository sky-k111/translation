/**
 * Cache Manager for POS Recognition Results
 * 
 * Implements a simple FIFO (First-In-First-Out) cache for storing and retrieving
 * part-of-speech analysis results to improve performance.
 * 
 * Requirements: 9.2, 9.3, 9.4
 */

import { CachedPOSResult, CacheStats } from '../types/pos';

/**
 * Cache Manager interface
 */
export interface CacheManager {
  /**
   * Get cached POS result for a sentence
   * @param key - The sentence key
   * @returns Cached result or null if not found
   */
  get(key: string): CachedPOSResult | null;
  
  /**
   * Store POS result in cache
   * @param key - The sentence key
   * @param result - The POS result to cache
   */
  set(key: string, result: CachedPOSResult): void;
  
  /**
   * Clear expired cache entries
   */
  evict(): void;
  
  /**
   * Get cache statistics
   * @returns Current cache statistics
   */
  getStats(): CacheStats;
}

/**
 * Simple FIFO Cache Manager implementation
 * 
 * Features:
 * - Maximum size of 1000 entries
 * - FIFO eviction strategy when cache is full
 * - Tracks hit/miss statistics
 * - Handles errors gracefully
 */
export class SimpleCacheManager implements CacheManager {
  private cache: Map<string, CachedPOSResult>;
  private readonly maxSize: number = 1000;
  private stats: { hits: number; misses: number };
  
  constructor() {
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0 };
  }
  
  /**
   * Get cached POS result
   * Requirement 9.2: Retrieve results in 10ms
   */
  get(key: string): CachedPOSResult | null {
    try {
      const result = this.cache.get(key);
      if (result) {
        this.stats.hits++;
        return result;
      }
      this.stats.misses++;
      return null;
    } catch (error) {
      console.error('Cache read error:', error);
      this.stats.misses++;
      return null;
    }
  }
  
  /**
   * Store POS result in cache
   * Requirement 9.3: Store at least 1000 sentence-POS mappings
   * Requirement 9.4: Evict oldest entries when memory limit exceeded
   */
  set(key: string, result: CachedPOSResult): void {
    try {
      // If cache is full, evict the oldest entry (FIFO)
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey !== undefined) {
          this.cache.delete(firstKey);
        }
      }
      
      this.cache.set(key, result);
    } catch (error) {
      console.error('Cache write error:', error);
      // If write fails and cache is large, try to free up space
      if (this.cache.size > this.maxSize / 2) {
        this.evictOldest(100);
        try {
          this.cache.set(key, result);
        } catch (retryError) {
          console.error('Cache write retry failed:', retryError);
        }
      }
    }
  }
  
  /**
   * Clear expired cache entries
   * Currently implements a simple eviction of oldest entries
   */
  evict(): void {
    try {
      // Evict oldest 10% of entries if cache is near capacity
      if (this.cache.size > this.maxSize * 0.9) {
        const entriesToEvict = Math.floor(this.maxSize * 0.1);
        this.evictOldest(entriesToEvict);
      }
    } catch (error) {
      console.error('Cache eviction error:', error);
    }
  }
  
  /**
   * Get cache statistics
   * @returns Current cache statistics including hit rate
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 
      ? (this.stats.hits / totalRequests) * 100 
      : 0;
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: parseFloat(hitRate.toFixed(2))
    };
  }
  
  /**
   * Helper method to evict the oldest N entries
   * @param count - Number of entries to evict
   */
  private evictOldest(count: number): void {
    const keysToDelete: string[] = [];
    const iterator = this.cache.keys();
    
    for (let i = 0; i < count && i < this.cache.size; i++) {
      const key = iterator.next().value;
      if (key !== undefined) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }
  
  /**
   * Clear all cache entries (useful for testing)
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }
}
