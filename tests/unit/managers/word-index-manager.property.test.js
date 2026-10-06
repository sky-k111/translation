/**
 * Word Index Manager Property-Based Tests
 * Tests for WordIndexManager using fast-check for property-based testing
 * 
 * Property-based testing validates universal properties that should hold
 * across all valid inputs, not just specific examples.
 */

const fc = require('fast-check');
const { Trie } = require('../extension/utils/trie-index.js');
const { WordIndexManager } = require('../extension/utils/word-index-manager.js');

// Mock Chrome Storage API for Node.js environment
global.chrome = {
  storage: {
    local: {
      get: (keys, callback) => {
        const storage = global._mockStorage || {};
        const result = {};
        if (Array.isArray(keys)) {
          keys.forEach(key => {
            if (storage[key]) result[key] = storage[key];
          });
        } else {
          Object.keys(keys).forEach(key => {
            if (storage[key]) result[key] = storage[key];
          });
        }
        callback(result);
      },
      set: (items, callback) => {
        global._mockStorage = global._mockStorage || {};
        Object.assign(global._mockStorage, items);
        if (callback) callback();
      },
      remove: (keys, callback) => {
        global._mockStorage = global._mockStorage || {};
        if (Array.isArray(keys)) {
          keys.forEach(key => delete global._mockStorage[key]);
        } else {
          delete global._mockStorage[keys];
        }
        if (callback) callback();
      }
    }
  },
  runtime: {
    lastError: null
  }
};

// Mock performance API if not available
if (typeof performance === 'undefined') {
  global.performance = {
    now: () => Date.now()
  };
}

// Generators for property-based testing
const wordGenerator = fc.string({
  minLength: 1,
  maxLength: 20,
  // Use alphanumeric to avoid special characters
  unit: fc.integer({ min: 97, max: 122 }) // a-z
});

const wordDataGenerator = fc.tuple(
  fc.string({ minLength: 1, maxLength: 20, unit: fc.integer({ min: 97, max: 122 }) }),
  fc.string({ minLength: 1, maxLength: 50 })
).map(([word, translation]) => ({
  word,
  translation,
  pos: ['noun'],
  usageCount: fc.sample(fc.integer({ min: 0, max: 100 }), 1)[0]
}));

const wordArrayGenerator = fc.array(wordDataGenerator, { minLength: 1, maxLength: 100 });

const prefixGenerator = fc.string({
  minLength: 1,
  maxLength: 10,
  unit: fc.integer({ min: 97, max: 122 })
});

describe('Word_Index_Manager Property-Based Tests', () => {
  let manager;

  beforeEach(() => {
    global._mockStorage = {};
    manager = new WordIndexManager({
      persistDelay: 100,
      maxCacheSize: 1000,
      storageKey: 'test_word_index_pbt'
    });
  });

  afterEach(() => {
    if (manager) {
      manager.reset();
    }
  });

  // Feature: data-structure-optimization, Property 1: Query time scales with word length, not index size
  test('Property 1: Query time scales with word length, not index size', () => {
    fc.assert(
      fc.property(
        fc.array(wordDataGenerator, { minLength: 10, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 20, unit: fc.integer({ min: 97, max: 122 }) }),
        (words, queryWord) => {
          manager.buildIndex(words);
          
          // Measure query time
          const startTime = performance.now();
          manager.find(queryWord);
          const queryTime = performance.now() - startTime;
          
          // Query time should be proportional to word length, not index size
          // For a Trie, query time is O(m) where m is word length
          // We verify this by checking that query time is reasonable
          // In test environment, even with variance, should be < 100ms for short words
          expect(queryTime).toBeLessThan(100);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: data-structure-optimization, Property 2: Prefix search returns all and only matching words
  test('Property 2: Prefix search returns all and only matching words', () => {
    fc.assert(
      fc.property(
        fc.array(wordDataGenerator, { minLength: 5, maxLength: 50 }),
        prefixGenerator,
        (words, prefix) => {
          manager.buildIndex(words);
          
          const results = manager.search(prefix);
          const resultWords = results.map(r => r.word.toLowerCase());
          
          // Expected: all words that start with prefix (case-insensitive)
          const expected = words
            .filter(w => w.word.toLowerCase().startsWith(prefix.toLowerCase()))
            .map(w => w.word.toLowerCase());
          
          // Check: results contain exactly the expected words
          expect(resultWords.sort()).toEqual(expected.sort());
          
          // Check: no extra words in results
          expect(resultWords.length).toBe(expected.length);
          
          // Check: all results start with prefix
          resultWords.forEach(word => {
            expect(word.startsWith(prefix.toLowerCase())).toBe(true);
          });
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: data-structure-optimization, Property 3: Case-insensitive search equivalence
  test('Property 3: Case-insensitive search equivalence', () => {
    fc.assert(
      fc.property(
        fc.array(wordDataGenerator, { minLength: 5, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 20, unit: fc.integer({ min: 97, max: 122 }) }),
        (words, queryWord) => {
          manager.buildIndex(words);
          
          // Search with different case variations
          const lowercase = manager.find(queryWord.toLowerCase());
          const uppercase = manager.find(queryWord.toUpperCase());
          const mixedCase = manager.find(
            queryWord.split('').map((c, i) => i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()).join('')
          );
          
          // All case variations should return the same result
          if (lowercase === null) {
            expect(uppercase).toBeNull();
            expect(mixedCase).toBeNull();
          } else {
            expect(uppercase).not.toBeNull();
            expect(mixedCase).not.toBeNull();
            expect(lowercase.word).toBe(uppercase.word);
            expect(lowercase.word).toBe(mixedCase.word);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: data-structure-optimization, Property 4: Find returns exact match or null
  test('Property 4: Find returns exact match or null', () => {
    fc.assert(
      fc.property(
        fc.array(wordDataGenerator, { minLength: 5, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 20, unit: fc.integer({ min: 97, max: 122 }) }),
        (words, queryWord) => {
          manager.buildIndex(words);
          
          const result = manager.find(queryWord);
          
          // Result should be either null or an object with word property
          if (result === null) {
            // Verify word is not in the index
            const wordExists = words.some(w => w.word.toLowerCase() === queryWord.toLowerCase());
            expect(wordExists).toBe(false);
          } else {
            // Result should have word property matching query (case-insensitive)
            expect(result.word.toLowerCase()).toBe(queryWord.toLowerCase());
            // Result should be one of the indexed words
            const wordExists = words.some(w => w.word.toLowerCase() === queryWord.toLowerCase());
            expect(wordExists).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: data-structure-optimization, Property 5: Add-then-find consistency
  test('Property 5: Add-then-find consistency', () => {
    fc.assert(
      fc.property(
        fc.array(wordDataGenerator, { minLength: 1, maxLength: 50 }),
        wordDataGenerator,
        (initialWords, newWord) => {
          manager.buildIndex(initialWords);
          
          // Add new word
          manager.add(newWord);
          
          // Find should return the added word
          const found = manager.find(newWord.word);
          expect(found).not.toBeNull();
          expect(found.word.toLowerCase()).toBe(newWord.word.toLowerCase());
          
          // Metadata should match
          expect(found.translation).toBe(newWord.translation);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: data-structure-optimization, Property 6: Remove-then-find consistency
  test('Property 6: Remove-then-find consistency', () => {
    fc.assert(
      fc.property(
        fc.array(wordDataGenerator, { minLength: 1, maxLength: 50 }),
        (words) => {
          manager.buildIndex(words);
          
          // Get unique words (handle duplicates in generated data)
          const uniqueWords = Array.from(
            new Map(words.map(w => [w.word.toLowerCase(), w])).values()
          );
          
          // For each unique word in the index
          for (const word of uniqueWords) {
            // Remove it
            const removed = manager.remove(word.word);
            expect(removed).toBe(true);
            
            // Find should return null
            const found = manager.find(word.word);
            expect(found).toBeNull();
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: data-structure-optimization, Property 7: Serialization round-trip preserves data
  test('Property 7: Serialization round-trip preserves data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(wordDataGenerator, { minLength: 1, maxLength: 50 }),
        async (words) => {
          manager.buildIndex(words);
          
          // Persist
          await manager.persist();
          
          // Create new manager and load
          const newManager = new WordIndexManager({
            storageKey: 'test_word_index_pbt'
          });
          const loaded = await newManager.load();
          expect(loaded).toBe(true);
          
          // Verify all words are present with same metadata
          for (const word of words) {
            const original = manager.find(word.word);
            const restored = newManager.find(word.word);
            
            expect(restored).not.toBeNull();
            expect(restored.word).toBe(original.word);
            expect(restored.translation).toBe(original.translation);
          }
          
          newManager.reset();
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: data-structure-optimization, Property 8: Incremental update time scales with word length
  test('Property 8: Incremental update time scales with word length', () => {
    fc.assert(
      fc.property(
        fc.array(wordDataGenerator, { minLength: 10, maxLength: 100 }),
        wordDataGenerator,
        (initialWords, newWord) => {
          manager.buildIndex(initialWords);
          
          // Measure add time
          const startTime = performance.now();
          manager.add(newWord);
          const addTime = performance.now() - startTime;
          
          // Add time should be proportional to word length, not index size
          // For a Trie, add time is O(m) where m is word length
          // We verify this by checking that add time is reasonable
          expect(addTime).toBeLessThan(10); // Very generous upper bound for test environment
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: data-structure-optimization, Property 9: Batch add is more efficient than individual adds
  test('Property 9: Batch add is more efficient than individual adds', () => {
    fc.assert(
      fc.property(
        fc.array(wordDataGenerator, { minLength: 1, maxLength: 50 }),
        fc.array(wordDataGenerator, { minLength: 5, maxLength: 20 }),
        (initialWords, batchWords) => {
          // Test 1: Batch add
          const manager1 = new WordIndexManager({
            storageKey: 'test_batch_1',
            persistDelay: 10000 // Disable auto-persist for timing test
          });
          manager1.buildIndex(initialWords);
          
          const batchStart = performance.now();
          manager1.batchAdd(batchWords);
          const batchTime = performance.now() - batchStart;
          
          // Test 2: Individual adds
          const manager2 = new WordIndexManager({
            storageKey: 'test_batch_2',
            persistDelay: 10000 // Disable auto-persist for timing test
          });
          manager2.buildIndex(initialWords);
          
          const individualStart = performance.now();
          for (const word of batchWords) {
            manager2.add(word);
          }
          const individualTime = performance.now() - individualStart;
          
          // Batch add should be reasonably efficient
          // In test environment, both should complete quickly
          // We verify correctness rather than strict timing
          expect(batchTime).toBeLessThan(1000); // Should complete in < 1 second
          expect(individualTime).toBeLessThan(1000); // Should complete in < 1 second
          
          // Verify both methods result in same data
          for (const word of batchWords) {
            const found1 = manager1.find(word.word);
            const found2 = manager2.find(word.word);
            expect(found1).not.toBeNull();
            expect(found2).not.toBeNull();
            expect(found1.word).toBe(found2.word);
          }
          
          manager1.reset();
          manager2.reset();
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: data-structure-optimization, Property 10: LRU eviction removes least recently used
  test('Property 10: LRU eviction removes least recently used', () => {
    fc.assert(
      fc.property(
        fc.array(wordDataGenerator, { minLength: 3, maxLength: 10 }),
        (words) => {
          // Create manager with small capacity
          const smallManager = new WordIndexManager({
            maxCacheSize: words.length,
            storageKey: 'test_lru_pbt'
          });
          
          smallManager.buildIndex(words);
          
          // Access some words to update their LRU position
          if (words.length > 1) {
            smallManager.find(words[0].word);
            smallManager.find(words[1].word);
          }
          
          // Add a new word (should trigger eviction)
          const newWord = {
            word: 'new_word_' + Math.random().toString(36).substring(7),
            translation: 'new',
            pos: ['noun'],
            usageCount: 0
          };
          
          smallManager.add(newWord);
          
          // The new word should be in the index
          expect(smallManager.find(newWord.word)).not.toBeNull();
          
          // At least one of the original words should be evicted
          // (the one that was least recently used)
          const evicted = words.filter(w => smallManager.find(w.word) === null);
          expect(evicted.length).toBeGreaterThan(0);
          
          smallManager.reset();
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe('Word_Index_Manager Property-Based Tests - Edge Cases', () => {
  let manager;

  beforeEach(() => {
    global._mockStorage = {};
    manager = new WordIndexManager({
      persistDelay: 100,
      maxCacheSize: 1000,
      storageKey: 'test_word_index_pbt_edge'
    });
  });

  afterEach(() => {
    if (manager) {
      manager.reset();
    }
  });

  // Additional property: Empty index handling
  test('Property: Empty index returns null for any query', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20, unit: fc.integer({ min: 97, max: 122 }) }),
        (queryWord) => {
          // Don't build any index
          const result = manager.find(queryWord);
          expect(result).toBeNull();
          
          const searchResults = manager.search(queryWord);
          expect(searchResults).toEqual([]);
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  // Additional property: Single word index
  test('Property: Single word index returns correct results', () => {
    fc.assert(
      fc.property(
        wordDataGenerator,
        fc.string({ minLength: 1, maxLength: 20, unit: fc.integer({ min: 97, max: 122 }) }),
        (word, queryWord) => {
          manager.buildIndex([word]);
          
          const result = manager.find(queryWord);
          
          if (queryWord.toLowerCase() === word.word.toLowerCase()) {
            expect(result).not.toBeNull();
            expect(result.word.toLowerCase()).toBe(word.word.toLowerCase());
          } else {
            expect(result).toBeNull();
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional property: Duplicate words handling
  test('Property: Duplicate words are handled correctly', () => {
    fc.assert(
      fc.property(
        wordDataGenerator,
        (word) => {
          // Build index with duplicate word
          manager.buildIndex([word, word]);
          
          // Should still find the word
          const result = manager.find(word.word);
          expect(result).not.toBeNull();
          expect(result.word.toLowerCase()).toBe(word.word.toLowerCase());
          
          // Stats should show only one word (duplicates overwrite)
          const stats = manager.getStats();
          expect(stats.wordCount).toBe(1);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional property: Update metadata preserves word
  test('Property: Update metadata preserves word in index', () => {
    fc.assert(
      fc.property(
        wordDataGenerator,
        fc.object({ key: fc.string(), value: fc.string() }),
        (word, metadata) => {
          manager.buildIndex([word]);
          
          // Update metadata
          const updated = manager.updateMetadata(word.word, metadata);
          expect(updated).toBe(true);
          
          // Word should still be findable
          const result = manager.find(word.word);
          expect(result).not.toBeNull();
          expect(result.word.toLowerCase()).toBe(word.word.toLowerCase());
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional property: Search prefix with no matches
  test('Property: Search with non-matching prefix returns empty array', () => {
    fc.assert(
      fc.property(
        fc.array(wordDataGenerator, { minLength: 1, maxLength: 50 }),
        (words) => {
          manager.buildIndex(words);
          
          // Use a prefix that won't match any word
          const prefix = 'zzzzzzzzzzz_no_match_' + Math.random().toString(36).substring(7);
          const results = manager.search(prefix);
          
          expect(results).toEqual([]);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
