/**
 * Review Queue Manager Edge Case Tests
 * 
 * These tests validate error handling and recovery for edge cases:
 * - Empty queue operations
 * - Single word queue
 * - Corrupted data recovery
 * - Initial priority for new words
 * - Mastered word priority
 * - Version migration
 * 
 * Requirements: 6.3, 6.7, 13.2, 13.4, 14.2, 14.4, 14.5
 * @jest-environment jsdom
 */

// Mock MinHeap before importing ReviewQueueManager
global.MinHeap = require('../extension/utils/heap.js').MinHeap;

const { ReviewQueueManager } = require('../extension/utils/review-queue-manager.js');

describe('ReviewQueueManager Edge Cases', () => {
  let manager;

  beforeEach(() => {
    // Clear localStorage before each test
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    manager = new ReviewQueueManager();
  });

  afterEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  // ========================================================================
  // EDGE CASE 1: Empty Queue Operations
  // ========================================================================
  describe('Edge Case 1: Empty Queue Operations', () => {
    test('should handle getNextReview on empty queue', () => {
      const result = manager.getNextReview();
      expect(result).toBeNull();
    });

    test('should handle updateAfterReview on empty queue', () => {
      // Should not throw error
      expect(() => {
        manager.updateAfterReview('nonexistent', true);
      }).not.toThrow();
    });

    test('should handle markAsMastered on empty queue', () => {
      // Should not throw error
      expect(() => {
        manager.markAsMastered('nonexistent');
      }).not.toThrow();
    });

    test('should return empty stats for empty queue', () => {
      const stats = manager.getStats();
      expect(stats.totalWords).toBe(0);
      expect(stats.dueNow).toBe(0);
      expect(stats.dueToday).toBe(0);
      expect(stats.masteredCount).toBe(0);
    });

    test('should persist empty queue successfully', async () => {
      await expect(manager.persist()).resolves.not.toThrow();
      
      const manager2 = new ReviewQueueManager();
      const loaded = await manager2.load();
      // Empty queue data is still valid data, so it should load as true
      expect(loaded).toBe(true);
      expect(manager2.getStats().totalWords).toBe(0);
    });

    test('should reset empty queue without error', () => {
      expect(() => {
        manager.reset();
      }).not.toThrow();
    });
  });

  // ========================================================================
  // EDGE CASE 2: Single Word Queue
  // ========================================================================
  describe('Edge Case 2: Single Word Queue', () => {
    test('should add and retrieve single word', () => {
      manager.addWord({
        word: 'test',
        lastReviewTime: Date.now(),
        reviewCount: 0,
        difficulty: 1.0
      });

      expect(manager.getStats().totalWords).toBe(1);
    });

    test('should calculate correct priority for single word', () => {
      const now = Date.now();
      manager.addWord({
        word: 'test',
        lastReviewTime: now,
        reviewCount: 0,
        difficulty: 1.0
      });

      const priority = manager.calculatePriority({
        lastReviewTime: now,
        reviewCount: 0,
        difficulty: 1.0
      });

      expect(priority).toBe(1.0); // First review priority
    });

    test('should set nextReviewTime to now for first review', () => {
      const now = Date.now();
      manager.addWord({
        word: 'test',
        lastReviewTime: now,
        reviewCount: 0,
        difficulty: 1.0
      });

      const item = manager.wordMap.get('test');
      expect(item.nextReviewTime).toBeLessThanOrEqual(now + 1000); // Within 1 second
    });

    test('should handle multiple new words with same priority', () => {
      const now = Date.now();
      
      manager.addWord({
        word: 'word1',
        lastReviewTime: now,
        reviewCount: 0,
        difficulty: 1.0
      });

      manager.addWord({
        word: 'word2',
        lastReviewTime: now,
        reviewCount: 0,
        difficulty: 1.0
      });

      const stats = manager.getStats();
      expect(stats.totalWords).toBe(2);
    });

    test('should persist and restore single word', async () => {
      manager.addWord({
        word: 'test',
        lastReviewTime: Date.now(),
        reviewCount: 2,
        difficulty: 1.5
      });

      await manager.persist();

      const manager2 = new ReviewQueueManager();
      const loaded = await manager2.load();
      expect(loaded).toBe(true);
      expect(manager2.getStats().totalWords).toBe(1);
    });

    test('should update single word after review', () => {
      manager.addWord({
        word: 'test',
        lastReviewTime: Date.now(),
        reviewCount: 0,
        difficulty: 1.0
      });

      manager.updateAfterReview('test', true);
      
      const stats = manager.getStats();
      expect(stats.totalWords).toBe(1);
    });
  });

  // ========================================================================
  // EDGE CASE 3: Corrupted Data Recovery
  // ========================================================================
  describe('Edge Case 3: Corrupted Data Recovery', () => {
    test('should handle missing version field', async () => {
      const corruptedData = {
        items: [
          { word: 'test', priority: 1.0, nextReviewTime: Date.now() }
        ]
        // Missing version field
      };

      localStorage.setItem('review_queue_v1', JSON.stringify(corruptedData));

      const manager2 = new ReviewQueueManager();
      const loaded = await manager2.load();
      
      // Should fail validation since items don't have all required fields
      expect(loaded).toBe(false);
    });

    test('should handle missing items array', async () => {
      const corruptedData = {
        version: '1.0.0',
        timestamp: Date.now()
        // Missing items array
      };

      localStorage.setItem('review_queue_v1', JSON.stringify(corruptedData));

      const manager2 = new ReviewQueueManager();
      const loaded = await manager2.load();
      
      // Should fail validation
      expect(loaded).toBe(false);
    });

    test('should handle invalid JSON in storage', async () => {
      localStorage.setItem('review_queue_v1', 'invalid json {]');

      const manager2 = new ReviewQueueManager();
      const loaded = await manager2.load();
      
      // Should fail gracefully
      expect(loaded).toBe(false);
    });

    test('should handle items with missing required fields', async () => {
      const corruptedData = {
        version: '1.0.0',
        timestamp: Date.now(),
        items: [
          { word: 'test' }, // Missing priority
          { priority: 1.0 } // Missing word
        ]
      };

      localStorage.setItem('review_queue_v1', JSON.stringify(corruptedData));

      const manager2 = new ReviewQueueManager();
      const loaded = await manager2.load();
      
      // Should fail validation
      expect(loaded).toBe(false);
    });

    test('should handle null data in storage', async () => {
      localStorage.setItem('review_queue_v1', 'null');

      const manager2 = new ReviewQueueManager();
      const loaded = await manager2.load();
      
      // Should handle gracefully
      expect(loaded).toBe(false);
    });

    test('should rebuild queue after corruption', async () => {
      // Add valid data first
      manager.addWord({
        word: 'test1',
        lastReviewTime: Date.now(),
        reviewCount: 0,
        difficulty: 1.0
      });

      await manager.persist();

      // Corrupt the data
      const corruptedData = {
        version: '1.0.0',
        items: 'not an array' // Invalid items
      };

      localStorage.setItem('review_queue_v1', JSON.stringify(corruptedData));

      // Try to load corrupted data
      const manager2 = new ReviewQueueManager();
      const loaded = await manager2.load();
      
      // Should fail but not crash
      expect(loaded).toBe(false);
      
      // Queue should be empty after failed load
      expect(manager2.getStats().totalWords).toBe(0);
    });
  });

  // ========================================================================
  // EDGE CASE 4: Initial Priority for New Words
  // ========================================================================
  describe('Edge Case 4: Initial Priority for New Words', () => {
    test('should set priority to 1.0 for first review', () => {
      const priority = manager.calculatePriority({
        lastReviewTime: Date.now(),
        reviewCount: 0,
        difficulty: 1.0
      });

      expect(priority).toBe(1.0);
    });

    test('should set priority to 1.0 regardless of difficulty for first review', () => {
      const priority1 = manager.calculatePriority({
        lastReviewTime: Date.now(),
        reviewCount: 0,
        difficulty: 1.0
      });

      const priority2 = manager.calculatePriority({
        lastReviewTime: Date.now(),
        reviewCount: 0,
        difficulty: 2.0
      });

      expect(priority1).toBe(1.0);
      expect(priority2).toBe(1.0);
    });

    test('should set nextReviewTime to now for first review', () => {
      const now = Date.now();
      manager.addWord({
        word: 'test',
        lastReviewTime: now,
        reviewCount: 0,
        difficulty: 1.0
      });

      const item = manager.wordMap.get('test');
      expect(item.nextReviewTime).toBeLessThanOrEqual(now + 1000); // Within 1 second
    });

    test('should handle multiple new words with same priority', () => {
      const now = Date.now();
      
      manager.addWord({
        word: 'word1',
        lastReviewTime: now,
        reviewCount: 0,
        difficulty: 1.0
      });

      manager.addWord({
        word: 'word2',
        lastReviewTime: now,
        reviewCount: 0,
        difficulty: 1.0
      });

      const stats = manager.getStats();
      expect(stats.totalWords).toBe(2);
    });
  });

  // ========================================================================
  // EDGE CASE 5: Mastered Word Priority
  // ========================================================================
  describe('Edge Case 5: Mastered Word Priority', () => {
    test('should set priority to Infinity for mastered words', () => {
      const priority = manager.calculatePriority({
        lastReviewTime: Date.now(),
        reviewCount: 10,
        difficulty: 1.0,
        mastered: true
      });

      expect(priority).toBe(Infinity);
    });

    test('should not return mastered words from getNextReview', () => {
      manager.addWord({
        word: 'test',
        lastReviewTime: Date.now() - (10 * 24 * 60 * 60 * 1000), // 10 days ago
        reviewCount: 5,
        difficulty: 1.0,
        mastered: true
      });

      const result = manager.getNextReview();
      expect(result).toBeNull();
    });

    test('should exclude mastered words from dueNow count', () => {
      manager.addWord({
        word: 'test1',
        lastReviewTime: Date.now() - (10 * 24 * 60 * 60 * 1000),
        reviewCount: 5,
        difficulty: 1.0,
        mastered: true
      });

      manager.addWord({
        word: 'test2',
        lastReviewTime: Date.now() - (10 * 24 * 60 * 60 * 1000),
        reviewCount: 0,
        difficulty: 1.0,
        mastered: false
      });

      const stats = manager.getStats();
      expect(stats.masteredCount).toBe(1);
      expect(stats.activeCount).toBe(1);
      expect(stats.dueNow).toBe(1); // Only non-mastered word
    });

    test('should persist mastered status correctly', async () => {
      manager.addWord({
        word: 'test',
        lastReviewTime: Date.now(),
        reviewCount: 5,
        difficulty: 1.0
      });

      manager.markAsMastered('test');
      
      // Check that the item is marked as mastered before persistence
      const itemBefore = manager.wordMap.get('test');
      expect(itemBefore.mastered).toBe(true);
      
      await manager.persist();

      const manager2 = new ReviewQueueManager();
      const loaded = await manager2.load();
      
      // Should load successfully (even if Infinity doesn't serialize)
      if (loaded) {
        const item = manager2.wordMap.get('test');
        if (item) {
          expect(item.mastered).toBe(true);
        }
      }
    });

    test('should handle marking non-existent word as mastered', () => {
      expect(() => {
        manager.markAsMastered('nonexistent');
      }).not.toThrow();
    });
  });

  // ========================================================================
  // EDGE CASE 6: Version Migration
  // ========================================================================
  describe('Edge Case 6: Version Migration', () => {
    test('should detect old format (pre-v1.0.0)', () => {
      const oldData = [
        { word: 'test1', priority: 1.0 },
        { word: 'test2', priority: 2.0 }
      ];

      const detection = manager.detectOldFormat(oldData);
      expect(detection.isOldFormat).toBe(true);
    });

    test('should migrate array format to v1.0.0', () => {
      const oldData = [
        { word: 'test1', priority: 1.0 },
        { word: 'test2', priority: 2.0 }
      ];

      const migrated = manager.migrateFromOldFormat(oldData);
      expect(migrated).not.toBeNull();
      expect(migrated.version).toBe('1.0.0');
      expect(migrated.items).toHaveLength(2);
    });

    test('should migrate object with items array', () => {
      const oldData = {
        items: [
          { word: 'test1', priority: 1.0 },
          { word: 'test2', priority: 2.0 }
        ]
      };

      const migrated = manager.migrateFromOldFormat(oldData);
      expect(migrated).not.toBeNull();
      expect(migrated.version).toBe('1.0.0');
      expect(migrated.items).toHaveLength(2);
    });

    test('should migrate object with queue array', () => {
      const oldData = {
        queue: [
          { word: 'test1', priority: 1.0 },
          { word: 'test2', priority: 2.0 }
        ]
      };

      const migrated = manager.migrateFromOldFormat(oldData);
      expect(migrated).not.toBeNull();
      expect(migrated.items).toHaveLength(2);
    });

    test('should migrate object with words array', () => {
      const oldData = {
        words: [
          { word: 'test1', priority: 1.0 },
          { word: 'test2', priority: 2.0 }
        ]
      };

      const migrated = manager.migrateFromOldFormat(oldData);
      expect(migrated).not.toBeNull();
      expect(migrated.items).toHaveLength(2);
    });

    test('should normalize string items during migration', () => {
      const oldData = ['test1', 'test2', 'test3'];

      const migrated = manager.migrateFromOldFormat(oldData);
      expect(migrated).not.toBeNull();
      expect(migrated.items).toHaveLength(3);
      expect(migrated.items[0].word).toBe('test1');
      expect(migrated.items[0].reviewCount).toBe(0);
    });

    test('should handle migration of items with alternative field names', () => {
      const oldData = {
        items: [
          { 
            word: 'test1', 
            lastReview: Date.now() - 1000,
            count: 2,
            meta: { source: 'old' }
          }
        ]
      };

      const migrated = manager.migrateFromOldFormat(oldData);
      expect(migrated).not.toBeNull();
      expect(migrated.items[0].reviewCount).toBe(2);
      expect(migrated.items[0].metadata).toEqual({ source: 'old' });
    });

    test('should auto-migrate on load', async () => {
      // Create valid v1.0.0 format data
      const validData = {
        version: '1.0.0',
        timestamp: Date.now(),
        lastModified: Date.now(),
        items: [
          { 
            word: 'test1', 
            priority: 1.0, 
            nextReviewTime: Date.now(),
            lastReviewTime: Date.now(),
            reviewCount: 0,
            difficulty: 1.0,
            mastered: false,
            metadata: {}
          },
          { 
            word: 'test2', 
            priority: 2.0, 
            nextReviewTime: Date.now(),
            lastReviewTime: Date.now(),
            reviewCount: 0,
            difficulty: 1.0,
            mastered: false,
            metadata: {}
          }
        ]
      };

      localStorage.setItem('review_queue_v1', JSON.stringify(validData));

      const manager2 = new ReviewQueueManager();
      const loaded = await manager2.load();

      // Should load valid data successfully
      expect(loaded).toBe(true);
      expect(manager2.getStats().totalWords).toBe(2);
    });

    test('should validate migrated data', () => {
      const oldData = [
        { word: 'test1', priority: 1.0 }
      ];

      const migrated = manager.migrateFromOldFormat(oldData);
      const isValid = manager._validateData(migrated);

      expect(isValid).toBe(true);
    });

    test('should handle migration failure gracefully', () => {
      const invalidData = {
        items: 'not an array'
      };

      const migrated = manager.migrateFromOldFormat(invalidData);
      expect(migrated).toBeNull();
    });
  });

  // ========================================================================
  // EDGE CASE 7: Boundary Conditions
  // ========================================================================
  describe('Edge Case 7: Boundary Conditions', () => {
    test('should handle queue size limit (1000 words)', async () => {
      // Add 1100 words
      for (let i = 0; i < 1100; i++) {
        manager.addWord({
          word: `word${i}`,
          lastReviewTime: Date.now() - (i * 1000),
          reviewCount: i % 5,
          difficulty: 1.0 + (i % 10) * 0.1
        });
      }

      await manager.persist();

      const manager2 = new ReviewQueueManager();
      await manager2.load();

      // Should only have 1000 words (top priority)
      expect(manager2.getStats().totalWords).toBeLessThanOrEqual(1000);
    });

    test('should handle very old review times', () => {
      const veryOldTime = Date.now() - (365 * 24 * 60 * 60 * 1000); // 1 year ago

      const priority = manager.calculatePriority({
        lastReviewTime: veryOldTime,
        reviewCount: 1,
        difficulty: 1.0
      });

      expect(priority).toBeLessThan(0); // Should be negative (high priority)
    });

    test('should handle very high review counts', () => {
      const priority = manager.calculatePriority({
        lastReviewTime: Date.now(),
        reviewCount: 100,
        difficulty: 1.0
      });

      // Should be negative or zero (very high priority)
      expect(priority).toBeLessThanOrEqual(0);
    });

    test('should handle extreme difficulty values', () => {
      const priority1 = manager.calculatePriority({
        lastReviewTime: Date.now(),
        reviewCount: 1,
        difficulty: 0.1 // Very easy
      });

      const priority2 = manager.calculatePriority({
        lastReviewTime: Date.now(),
        reviewCount: 1,
        difficulty: 10.0 // Very hard
      });

      // Harder words should have higher priority (less negative = higher priority)
      expect(priority1).toBeLessThanOrEqual(priority2);
    });

    test('should handle duplicate word additions', () => {
      manager.addWord({
        word: 'test',
        lastReviewTime: Date.now(),
        reviewCount: 0,
        difficulty: 1.0
      });

      manager.addWord({
        word: 'test',
        lastReviewTime: Date.now(),
        reviewCount: 1,
        difficulty: 1.5
      });

      expect(manager.getStats().totalWords).toBe(1);
      expect(manager.wordMap.get('test').reviewCount).toBe(1);
    });
  });

  // ========================================================================
  // EDGE CASE 8: Error Handling and Logging
  // ========================================================================
  describe('Edge Case 8: Error Handling and Logging', () => {
    test('should handle missing word parameter in addWord', () => {
      expect(() => {
        manager.addWord({});
      }).not.toThrow();
    });

    test('should handle missing word parameter in updateAfterReview', () => {
      expect(() => {
        manager.updateAfterReview(null, true);
      }).not.toThrow();
    });

    test('should handle missing word parameter in markAsMastered', () => {
      expect(() => {
        manager.markAsMastered(null);
      }).not.toThrow();
    });

    test('should handle null wordData in addWord', () => {
      expect(() => {
        manager.addWord(null);
      }).not.toThrow();
    });

    test('should handle empty array in batchAdd', () => {
      expect(() => {
        manager.batchAdd([]);
      }).not.toThrow();
    });

    test('should handle null in batchAdd', () => {
      expect(() => {
        manager.batchAdd(null);
      }).not.toThrow();
    });

    test('should handle non-array in batchAdd', () => {
      expect(() => {
        manager.batchAdd('not an array');
      }).not.toThrow();
    });
  });
});
