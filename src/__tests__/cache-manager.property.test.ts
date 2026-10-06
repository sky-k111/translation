/**
 * Property-Based Tests for Cache Manager
 * 
 * Feature: pos-recognition-optimization
 * Property 9: Cache round-trip consistency
 * 
 * Validates: Requirements 9.2
 */

import fc from 'fast-check';
import { SimpleCacheManager } from '../services/cache-manager';
import { CachedPOSResult, POSTag } from '../types/pos';

describe('Cache Manager - Property-Based Tests', () => {
  /**
   * Property 9: Cache round-trip consistency
   * 
   * For any sentence and POS analysis result, if we store it in the cache
   * and then retrieve it, we should get back exactly the same result.
   * 
   * Validates: Requirements 9.2
   */
  test('Property 9: Cache round-trip consistency - stored and retrieved results are identical', () => {
    const cache = new SimpleCacheManager();
    
    fc.assert(
      fc.property(
        // Generate random sentence
        fc.string({ minLength: 5, maxLength: 100 }),
        // Generate random array of POS tags
        fc.array(
          fc.constantFrom<POSTag>('noun', 'verb', 'adjective', 'adverb', 'unknown'),
          { minLength: 1, maxLength: 20 }
        ),
        // Generate random timestamp
        fc.integer({ min: Date.now() - 1000000, max: Date.now() }),
        (sentence, posTags, timestamp) => {
          // Create a POS result with the generated data
          const original: CachedPOSResult = {
            sentence,
            posMap: new Map(posTags.map((tag, idx) => [idx, tag])),
            timestamp
          };
          
          // Store in cache
          cache.set(sentence, original);
          
          // Retrieve from cache
          const retrieved = cache.get(sentence);
          
          // Verify retrieval succeeded
          if (!retrieved) {
            return false;
          }
          
          // Verify all fields are equal
          const sentenceMatches = retrieved.sentence === original.sentence;
          const timestampMatches = retrieved.timestamp === original.timestamp;
          const mapSizeMatches = retrieved.posMap.size === original.posMap.size;
          
          // Verify all map entries are equal
          const allEntriesMatch = Array.from(original.posMap.entries()).every(
            ([pos, tag]) => retrieved.posMap.get(pos) === tag
          );
          
          return sentenceMatches && timestampMatches && mapSizeMatches && allEntriesMatch;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Cache handles multiple unique keys correctly
   * 
   * When storing multiple different sentences, each should be retrievable
   * with its correct associated data.
   */
  test('Property: Multiple unique keys maintain separate cached values', () => {
    fc.assert(
      fc.property(
        // Generate array of unique sentences with their POS data
        fc.array(
          fc.record({
            sentence: fc.string({ minLength: 5, maxLength: 50 }),
            posTags: fc.array(
              fc.constantFrom<POSTag>('noun', 'verb', 'adjective', 'adverb'),
              { minLength: 1, maxLength: 10 }
            )
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (entries) => {
          const cache = new SimpleCacheManager();
          
          // Store all entries
          entries.forEach(entry => {
            const result: CachedPOSResult = {
              sentence: entry.sentence,
              posMap: new Map(entry.posTags.map((tag, idx) => [idx, tag])),
              timestamp: Date.now()
            };
            cache.set(entry.sentence, result);
          });
          
          // Verify each entry can be retrieved correctly
          return entries.every(entry => {
            const retrieved = cache.get(entry.sentence);
            if (!retrieved) return false;
            
            return retrieved.sentence === entry.sentence &&
                   retrieved.posMap.size === entry.posTags.length;
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Cache miss returns null
   * 
   * When requesting a key that was never stored, cache should return null
   * and increment miss counter.
   */
  test('Property: Cache miss returns null for non-existent keys', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 50 }),
        (sentence) => {
          const cache = new SimpleCacheManager();
          const initialStats = cache.getStats();
          
          // Try to get a non-existent key
          const result = cache.get(sentence);
          const afterStats = cache.getStats();
          
          // Should return null and increment misses
          return result === null && 
                 afterStats.misses === initialStats.misses + 1 &&
                 afterStats.hits === initialStats.hits;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Cache hit increments hit counter
   * 
   * When retrieving an existing key, cache should return the value
   * and increment hit counter.
   */
  test('Property: Cache hit increments hit counter correctly', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 50 }),
        fc.array(fc.constantFrom<POSTag>('noun', 'verb', 'adjective'), { minLength: 1, maxLength: 5 }),
        (sentence, posTags) => {
          const cache = new SimpleCacheManager();
          
          // Store a value
          const result: CachedPOSResult = {
            sentence,
            posMap: new Map(posTags.map((tag, idx) => [idx, tag])),
            timestamp: Date.now()
          };
          cache.set(sentence, result);
          
          const initialStats = cache.getStats();
          
          // Retrieve the value
          const retrieved = cache.get(sentence);
          const afterStats = cache.getStats();
          
          // Should return value and increment hits
          return retrieved !== null &&
                 afterStats.hits === initialStats.hits + 1 &&
                 afterStats.misses === initialStats.misses;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Cache stats are consistent
   * 
   * Hit rate should always be hits / (hits + misses) * 100
   */
  test('Property: Cache statistics are mathematically consistent', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            sentence: fc.string({ minLength: 5, maxLength: 30 }),
            shouldStore: fc.boolean()
          }),
          { minLength: 5, maxLength: 20 }
        ),
        (operations) => {
          const cache = new SimpleCacheManager();
          
          // Perform random operations
          operations.forEach(op => {
            if (op.shouldStore) {
              const result: CachedPOSResult = {
                sentence: op.sentence,
                posMap: new Map([[0, 'noun']]),
                timestamp: Date.now()
              };
              cache.set(op.sentence, result);
            }
            cache.get(op.sentence);
          });
          
          const stats = cache.getStats();
          const totalRequests = stats.hits + stats.misses;
          
          if (totalRequests === 0) {
            return stats.hitRate === 0;
          }
          
          const expectedHitRate = (stats.hits / totalRequests) * 100;
          const tolerance = 0.01; // Allow small floating point differences
          
          return Math.abs(stats.hitRate - expectedHitRate) < tolerance;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Cache respects maximum size limit
   * 
   * Cache size should never exceed the maximum size (1000 entries)
   */
  test('Property: Cache size never exceeds maximum limit', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 5, maxLength: 30 }),
          { minLength: 1000, maxLength: 1500 }
        ),
        (sentences) => {
          const cache = new SimpleCacheManager();
          
          // Store many entries
          sentences.forEach((sentence, idx) => {
            const result: CachedPOSResult = {
              sentence: `${sentence}_${idx}`, // Make unique
              posMap: new Map([[0, 'noun']]),
              timestamp: Date.now()
            };
            cache.set(result.sentence, result);
          });
          
          const stats = cache.getStats();
          
          // Cache size should not exceed 1000
          return stats.size <= 1000;
        }
      ),
      { numRuns: 10 } // Fewer runs since this test is expensive
    );
  });
});
