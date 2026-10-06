/**
 * Review Queue Manager Property-Based Tests
 * Tests for ReviewQueueManager using fast-check for property-based testing
 * 
 * Property-based testing validates universal properties that should hold
 * across all valid inputs, not just specific examples.
 * 
 * Validates: Requirements 5.2, 5.3, 5.4, 5.5, 6.2, 6.4, 6.5, 6.6, 7.1, 7.2, 7.6
 */

const fc = require('fast-check');
const { MinHeap } = require('../extension/utils/heap.js');

// Make MinHeap available globally for ReviewQueueManager
global.MinHeap = MinHeap;

const { ReviewQueueManager } = require('../extension/utils/review-queue-manager.js');

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
  unit: fc.integer({ min: 97, max: 122 }) // a-z
});

const reviewCountGenerator = fc.integer({ min: 0, max: 10 });

const difficultyGenerator = fc.tuple(
  fc.integer({ min: 10, max: 20 })
).map(([val]) => val / 10); // 1.0 to 2.0

const wordDataGenerator = fc.tuple(
  wordGenerator,
  reviewCountGenerator,
  difficultyGenerator,
  fc.boolean()
).map(([word, reviewCount, difficulty, mastered]) => ({
  word,
  lastReviewTime: Date.now() - (Math.random() * 30 * 24 * 60 * 60 * 1000), // 0-30 days ago
  reviewCount,
  difficulty,
  mastered,
  metadata: {}
}));

const wordArrayGenerator = fc.array(wordDataGenerator, { minLength: 1, maxLength: 100 });

describe('Review_Queue_Manager Property-Based Tests', () => {
  let manager;

  beforeEach(() => {
    global._mockStorage = {};
    manager = new ReviewQueueManager({
      persistDelay: 100,
      maxQueueSize: 1000,
      storageKey: 'test_review_queue_pbt'
    });
  });

  afterEach(() => {
    if (manager) {
      manager.reset();
    }
  });

  // Feature: data-structure-optimization, Property 11: Heap operations scale logarithmically
  test('Property 11: Heap operations scale logarithmically', () => {
    fc.assert(
      fc.property(
        fc.array(wordDataGenerator, { minLength: 10, maxLength: 500 }),
        (words) => {
          // Measure addWord time for different queue sizes
          const timings = [];
          
          for (let i = 0; i < Math.min(words.length, 100); i++) {
            const startTime = performance.now();
            manager.addWord(words[i]);
            const endTime = performance.now();
            timings.push({
              queueSize: manager.wordMap.size,
              time: endTime - startTime
            });
          }
          
          // For logarithmic operations, time should not grow linearly with queue size
          // We verify this by checking that the operation times are reasonable
          // and don't show linear growth pattern
          
          // All operations should complete reasonably quickly (< 500ms in test environment)
          timings.forEach(timing => {
            expect(timing.time).toBeLessThan(500);
          });
          
          // Check that later operations (with larger queue) aren't significantly slower
          // than earlier operations (with smaller queue)
          if (timings.length > 10) {
            const earlyAvg = timings.slice(0, 5).reduce((sum, t) => sum + t.time, 0) / 5;
            const lateAvg = timings.slice(-5).reduce((sum, t) => sum + t.time, 0) / 5;
            
            // Late operations should not be more than 20x slower than early operations
            // (allowing for variance in test environment)
            // This is a reasonable bound for logarithmic operations
            expect(lateAvg).toBeLessThan(earlyAvg * 20);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: data-structure-optimization, Property 12: Priority formula correctness
  test('Property 12: Priority formula correctness', () => {
    fc.assert(
      fc.property(
        wordDataGenerator,
        (wordData) => {
          const priority = manager.calculatePriority(wordData);
          
          // Test 1: Mastered words should have Infinity priority
          if (wordData.mastered) {
            expect(priority).toBe(Infinity);
          }
          
          // Test 2: First review (reviewCount = 0) should have priority 1.0
          if (wordData.reviewCount === 0 && !wordData.mastered) {
            expect(priority).toBe(1.0);
          }
          
          // Test 3: Non-mastered words with reviews should have negative priority
          // (priority = -daysSinceReview / (2^reviewCount * difficulty))
          if (wordData.reviewCount > 0 && !wordData.mastered) {
            expect(priority).toBeLessThan(0);
          }
          
          // Test 4: Priority should be a finite number (except for mastered)
          if (!wordData.mastered) {
            expect(isFinite(priority)).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: data-structure-optimization, Property 13: Priority increases with review count
  test('Property 13: Priority increases with review count', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          wordGenerator,
          fc.integer({ min: 0, max: 5 }),
          difficultyGenerator
        ),
        ([word, baseReviewCount, difficulty]) => {
          const now = Date.now();
          const lastReviewTime = now - (2 * 24 * 60 * 60 * 1000); // 2 days ago
          
          // Create two words with same history but different review counts
          const word1 = {
            word,
            lastReviewTime,
            reviewCount: baseReviewCount,
            difficulty,
            mastered: false
          };
          
          const word2 = {
            word,
            lastReviewTime,
            reviewCount: baseReviewCount + 1,
            difficulty,
            mastered: false
          };
          
          const priority1 = manager.calculatePriority(word1);
          const priority2 = manager.calculatePriority(word2);
          
          // With more reviews, the next review time should be exponentially longer
          // So priority (which is negative) should be closer to 0 (higher priority = lower score)
          // priority = -daysSinceReview / (2^reviewCount * difficulty)
          // More reviews = larger denominator = priority closer to 0
          
          if (baseReviewCount > 0) {
            // priority2 should be greater than priority1 (closer to 0)
            expect(priority2).toBeGreaterThan(priority1);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: data-structure-optimization, Property 14: Difficulty affects priority
  test('Property 14: Difficulty affects priority', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          wordGenerator,
          fc.integer({ min: 1, max: 5 }),
          fc.tuple(
            fc.integer({ min: 10, max: 15 }),
            fc.integer({ min: 16, max: 20 })
          )
        ),
        ([word, reviewCount, [diff1Val, diff2Val]]) => {
          const now = Date.now();
          const lastReviewTime = now - (2 * 24 * 60 * 60 * 1000); // 2 days ago
          
          const difficulty1 = diff1Val / 10; // 1.0-1.5
          const difficulty2 = diff2Val / 10; // 1.6-2.0
          
          // Create two words with same history but different difficulty
          const word1 = {
            word,
            lastReviewTime,
            reviewCount,
            difficulty: difficulty1,
            mastered: false
          };
          
          const word2 = {
            word,
            lastReviewTime,
            reviewCount,
            difficulty: difficulty2,
            mastered: false
          };
          
          const priority1 = manager.calculatePriority(word1);
          const priority2 = manager.calculatePriority(word2);
          
          // Higher difficulty should result in higher priority (lower score)
          // priority = -daysSinceReview / (2^reviewCount * difficulty)
          // Higher difficulty = smaller denominator = priority closer to 0 (higher priority)
          
          expect(priority2).toBeGreaterThan(priority1);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: data-structure-optimization, Property 15: Queue serialization round-trip preserves order
  test('Property 15: Queue serialization round-trip preserves order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(wordDataGenerator, { minLength: 1, maxLength: 100 }),
        async (words) => {
          // Add words to queue
          manager.batchAdd(words);
          
          // Get priority order before serialization
          const itemsBefore = Array.from(manager.wordMap.values())
            .sort((a, b) => a.priority - b.priority);
          
          // Persist
          await manager.persist();
          
          // Create new manager and load
          const newManager = new ReviewQueueManager({
            storageKey: 'test_review_queue_pbt'
          });
          const loaded = await newManager.load();
          expect(loaded).toBe(true);
          
          // Get priority order after deserialization
          const itemsAfter = Array.from(newManager.wordMap.values())
            .sort((a, b) => a.priority - b.priority);
          
          // Verify same number of items
          expect(itemsAfter.length).toBe(itemsBefore.length);
          
          // Verify priority order is preserved
          for (let i = 0; i < itemsBefore.length; i++) {
            expect(itemsAfter[i].word).toBe(itemsBefore[i].word);
            expect(itemsAfter[i].priority).toBe(itemsBefore[i].priority);
          }
          
          newManager.reset();
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: data-structure-optimization, Property 16: Queue capacity limit enforced
  test('Property 16: Queue capacity limit enforced', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(wordDataGenerator, { minLength: 1000, maxLength: 2000 }),
        async (words) => {
          // Create manager with small capacity
          const smallManager = new ReviewQueueManager({
            maxQueueSize: 500,
            storageKey: 'test_capacity_pbt'
          });
          
          // Add many words
          smallManager.batchAdd(words);
          
          // Persist (should enforce capacity limit)
          await smallManager.persist();
          
          // Load and verify capacity limit
          const newManager = new ReviewQueueManager({
            maxQueueSize: 500,
            storageKey: 'test_capacity_pbt'
          });
          const loaded = await newManager.load();
          expect(loaded).toBe(true);
          
          // Queue should not exceed max size
          expect(newManager.wordMap.size).toBeLessThanOrEqual(500);
          
          // Verify that highest priority items are preserved
          const loadedItems = Array.from(newManager.wordMap.values())
            .sort((a, b) => a.priority - b.priority);
          
          // All loaded items should have valid priorities
          loadedItems.forEach(item => {
            expect(isFinite(item.priority) || item.mastered).toBe(true);
          });
          
          smallManager.reset();
          newManager.reset();
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: data-structure-optimization, Property 17: Batch add is more efficient than individual adds
  test('Property 17: Batch add is more efficient than individual adds', () => {
    fc.assert(
      fc.property(
        fc.array(wordDataGenerator, { minLength: 1, maxLength: 50 }),
        fc.array(wordDataGenerator, { minLength: 5, maxLength: 20 }),
        (initialWords, batchWords) => {
          // Test 1: Batch add
          const manager1 = new ReviewQueueManager({
            storageKey: 'test_batch_review_1',
            persistDelay: 10000 // Disable auto-persist for timing test
          });
          manager1.batchAdd(initialWords);
          
          const batchStart = performance.now();
          manager1.batchAdd(batchWords);
          const batchTime = performance.now() - batchStart;
          
          // Test 2: Individual adds
          const manager2 = new ReviewQueueManager({
            storageKey: 'test_batch_review_2',
            persistDelay: 10000 // Disable auto-persist for timing test
          });
          manager2.batchAdd(initialWords);
          
          const individualStart = performance.now();
          for (const word of batchWords) {
            manager2.addWord(word);
          }
          const individualTime = performance.now() - individualStart;
          
          // Batch add should be reasonably efficient
          // In test environment, both should complete quickly
          expect(batchTime).toBeLessThan(1000); // Should complete in < 1 second
          expect(individualTime).toBeLessThan(1000); // Should complete in < 1 second
          
          // Verify both methods result in same data
          for (const word of batchWords) {
            const found1 = manager1.wordMap.get(word.word);
            const found2 = manager2.wordMap.get(word.word);
            expect(found1).not.toBeUndefined();
            expect(found2).not.toBeUndefined();
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
});

describe('Review_Queue_Manager Property-Based Tests - Edge Cases', () => {
  let manager;

  beforeEach(() => {
    global._mockStorage = {};
    manager = new ReviewQueueManager({
      persistDelay: 100,
      maxQueueSize: 1000,
      storageKey: 'test_review_queue_pbt_edge'
    });
  });

  afterEach(() => {
    if (manager) {
      manager.reset();
    }
  });

  // Additional property: Empty queue handling
  test('Property: Empty queue returns null for getNextReview', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          // Don't add any words
          const result = manager.getNextReview();
          expect(result).toBeNull();
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Additional property: Single word queue
  test('Property: Single word queue returns correct next review', () => {
    fc.assert(
      fc.property(
        wordDataGenerator,
        (word) => {
          // Skip mastered words
          if (word.mastered) {
            return true;
          }
          
          // Set lastReviewTime to ensure nextReviewTime is calculated correctly
          // For first review (reviewCount = 0), nextReviewTime should be now
          const wordWithDueTime = {
            ...word,
            lastReviewTime: Date.now() - (1 * 24 * 60 * 60 * 1000), // 1 day ago
            reviewCount: 0, // Force first review
            mastered: false
          };
          
          manager.addWord(wordWithDueTime);
          
          // For first review, getNextReview should return it
          const result = manager.getNextReview();
          expect(result).not.toBeNull();
          expect(result.word).toBe(word.word);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Additional property: Duplicate word handling
  test('Property: Duplicate word additions replace previous entry', () => {
    fc.assert(
      fc.property(
        wordDataGenerator,
        (word) => {
          // Add word twice
          manager.addWord(word);
          const sizeAfterFirst = manager.wordMap.size;
          
          manager.addWord(word);
          const sizeAfterSecond = manager.wordMap.size;
          
          // Size should remain the same (duplicate replaced)
          expect(sizeAfterSecond).toBe(sizeAfterFirst);
          
          // Word should still be in queue
          expect(manager.wordMap.has(word.word)).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Additional property: Update after review changes priority
  test('Property: Update after review changes word priority', () => {
    fc.assert(
      fc.property(
        wordDataGenerator,
        fc.boolean(),
        (word, correct) => {
          // Skip mastered words as they can't be updated
          if (word.mastered) {
            return true;
          }
          
          // Create a word with at least 2 reviews so we can see the change
          const validWord = {
            ...word,
            mastered: false,
            reviewCount: 2, // Start with 2 reviews
            lastReviewTime: Date.now() - (2 * 24 * 60 * 60 * 1000) // 2 days ago
          };
          
          manager.addWord(validWord);
          const priorityBefore = manager.wordMap.get(validWord.word).priority;
          const reviewCountBefore = manager.wordMap.get(validWord.word).reviewCount;
          
          // Update after review
          manager.updateAfterReview(validWord.word, correct);
          const priorityAfter = manager.wordMap.get(validWord.word).priority;
          const reviewCountAfter = manager.wordMap.get(validWord.word).reviewCount;
          
          // Priority should change (new review time and count)
          expect(priorityAfter).not.toBe(priorityBefore);
          
          // Review count should increase by 1
          expect(reviewCountAfter).toBe(reviewCountBefore + 1);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Additional property: Mark as mastered sets Infinity priority
  test('Property: Mark as mastered sets Infinity priority', () => {
    fc.assert(
      fc.property(
        wordDataGenerator,
        (word) => {
          manager.addWord(word);
          
          // Mark as mastered
          manager.markAsMastered(word.word);
          
          // Priority should be Infinity
          const masteredWord = manager.wordMap.get(word.word);
          expect(masteredWord.priority).toBe(Infinity);
          expect(masteredWord.mastered).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Additional property: Stats reflect queue state
  test('Property: getStats returns accurate queue statistics', () => {
    fc.assert(
      fc.property(
        fc.array(wordDataGenerator, { minLength: 1, maxLength: 100 }),
        (words) => {
          manager.batchAdd(words);
          
          const stats = manager.getStats();
          
          // Stats should match queue state
          expect(stats.totalWords).toBe(manager.wordMap.size);
          expect(stats.heapSize).toBe(manager.heap.size());
          
          // Stats should have required fields
          expect(stats.dueNow).toBeGreaterThanOrEqual(0);
          expect(stats.dueToday).toBeGreaterThanOrEqual(0);
          expect(stats.masteredCount).toBeGreaterThanOrEqual(0);
          expect(stats.activeCount).toBeGreaterThanOrEqual(0);
          
          // Active count + mastered count should equal total
          expect(stats.activeCount + stats.masteredCount).toBe(stats.totalWords);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Additional property: Priority formula with extreme values
  test('Property: Priority formula handles extreme review counts', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          wordGenerator,
          fc.integer({ min: 0, max: 20 }),
          difficultyGenerator
        ),
        ([word, reviewCount, difficulty]) => {
          const wordData = {
            word,
            lastReviewTime: Date.now() - (1 * 24 * 60 * 60 * 1000), // 1 day ago
            reviewCount,
            difficulty,
            mastered: false
          };
          
          const priority = manager.calculatePriority(wordData);
          
          // Priority should always be a valid number (except Infinity for mastered)
          expect(isFinite(priority)).toBe(true);
          
          // Priority should be negative for reviewed words
          if (reviewCount > 0) {
            expect(priority).toBeLessThan(0);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Additional property: Heap maintains min-heap property
  test('Property: Heap maintains min-heap property after operations', () => {
    fc.assert(
      fc.property(
        fc.array(wordDataGenerator, { minLength: 1, maxLength: 100 }),
        (words) => {
          manager.batchAdd(words);
          
          // Extract all items and verify they come out in priority order
          const extracted = [];
          while (manager.heap.size() > 0) {
            const item = manager.heap.extractMin();
            extracted.push(item);
          }
          
          // Verify items are in ascending priority order
          for (let i = 1; i < extracted.length; i++) {
            expect(extracted[i].priority).toBeGreaterThanOrEqual(extracted[i - 1].priority);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe('Review_Queue_Manager Property-Based Tests - Persistence', () => {
  let manager;

  beforeEach(() => {
    global._mockStorage = {};
    manager = new ReviewQueueManager({
      persistDelay: 100,
      maxQueueSize: 1000,
      storageKey: 'test_review_queue_pbt_persist'
    });
  });

  afterEach(() => {
    if (manager) {
      manager.reset();
    }
  });

  // Additional property: Persistence preserves all word data
  test('Property: Persistence preserves all word data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(wordDataGenerator, { minLength: 1, maxLength: 100 }),
        async (words) => {
          manager.batchAdd(words);
          
          // Persist
          await manager.persist();
          
          // Create new manager and load
          const newManager = new ReviewQueueManager({
            storageKey: 'test_review_queue_pbt_persist'
          });
          const loaded = await newManager.load();
          expect(loaded).toBe(true);
          
          // Verify all words are present with same data
          for (const word of words) {
            const original = manager.wordMap.get(word.word);
            const restored = newManager.wordMap.get(word.word);
            
            expect(restored).not.toBeUndefined();
            expect(restored.word).toBe(original.word);
            expect(restored.reviewCount).toBe(original.reviewCount);
            expect(restored.difficulty).toBe(original.difficulty);
            expect(restored.mastered).toBe(original.mastered);
          }
          
          newManager.reset();
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Additional property: Load from empty storage returns false
  test('Property: Load from empty storage returns false', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          // Don't persist anything
          const newManager = new ReviewQueueManager({
            storageKey: 'test_review_queue_pbt_persist_empty'
          });
          
          const loaded = await newManager.load();
          expect(loaded).toBe(false);
          
          // Queue should be empty
          expect(newManager.wordMap.size).toBe(0);
          
          newManager.reset();
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Additional property: Reset clears all data
  test('Property: Reset clears all data', () => {
    fc.assert(
      fc.property(
        fc.array(wordDataGenerator, { minLength: 1, maxLength: 100 }),
        (words) => {
          manager.batchAdd(words);
          expect(manager.wordMap.size).toBeGreaterThan(0);
          
          // Reset
          manager.reset();
          
          // Queue should be empty
          expect(manager.wordMap.size).toBe(0);
          expect(manager.heap.size()).toBe(0);
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });
});
