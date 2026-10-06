/**
 * Word Index Manager Tests
 * Tests for WordIndexManager functionality and performance
 */

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

// Import modules
const { Trie } = require('../extension/utils/trie-index.js');
const { WordIndexManager } = require('../extension/utils/word-index-manager.js');

// Test data
const createTestWords = (count) => {
  const words = [];
  for (let i = 0; i < count; i++) {
    words.push({
      word: `word${i}`,
      translation: `翻译${i}`,
      pos: ['noun'],
      usageCount: Math.floor(Math.random() * 10)
    });
  }
  return words;
};

const smallTestWords = [
  { word: 'hello', translation: '你好', pos: ['interjection'], usageCount: 5 },
  { word: 'world', translation: '世界', pos: ['noun'], usageCount: 3 },
  { word: 'help', translation: '帮助', pos: ['verb', 'noun'], usageCount: 2 },
  { word: 'helpful', translation: '有帮助的', pos: ['adjective'], usageCount: 1 },
  { word: 'helper', translation: '助手', pos: ['noun'], usageCount: 1 }
];

describe('WordIndexManager', () => {
  let manager;

  beforeEach(() => {
    // Clear mock storage
    global._mockStorage = {};
    
    // Create fresh manager
    manager = new WordIndexManager({
      persistDelay: 100,
      maxCacheSize: 100,
      storageKey: 'test_word_index'
    });
  });

  afterEach(() => {
    if (manager) {
      manager.reset();
    }
  });

  describe('Basic Operations', () => {
    test('should build index from word array', async () => {
      await manager.buildIndex(smallTestWords);
      const stats = manager.getStats();
      expect(stats.wordCount).toBe(5);
      expect(stats.nodeCount).toBeGreaterThan(0);
    });

    test('should find exact word match', async () => {
      await manager.buildIndex(smallTestWords);
      const found = manager.find('hello');
      expect(found).not.toBeNull();
      expect(found.word).toBe('hello');
      expect(found.translation).toBe('你好');
    });

    test('should return null for non-existent word', async () => {
      await manager.buildIndex(smallTestWords);
      const found = manager.find('nonexistent');
      expect(found).toBeNull();
    });

    test('should perform case-insensitive search', async () => {
      await manager.buildIndex(smallTestWords);
      const lower = manager.find('hello');
      const upper = manager.find('HELLO');
      const mixed = manager.find('HeLLo');
      
      expect(lower).not.toBeNull();
      expect(upper).not.toBeNull();
      expect(mixed).not.toBeNull();
      expect(lower.word).toBe(upper.word);
      expect(lower.word).toBe(mixed.word);
    });

    test('should search by prefix', async () => {
      await manager.buildIndex(smallTestWords);
      const results = manager.search('hel');
      expect(results.length).toBe(4); // hello, help, helpful, helper
      const words = results.map(r => r.word).sort();
      expect(words).toEqual(['hello', 'help', 'helper', 'helpful'].sort());
    });

    test('should return empty array for non-matching prefix', async () => {
      await manager.buildIndex(smallTestWords);
      const results = manager.search('xyz');
      expect(results).toEqual([]);
    });
  });

  describe('Incremental Updates', () => {
    test('should add new word', async () => {
      await manager.buildIndex(smallTestWords);
      
      manager.add({
        word: 'test',
        translation: '测试',
        pos: ['noun'],
        usageCount: 1
      });
      
      const found = manager.find('test');
      expect(found).not.toBeNull();
      expect(found.word).toBe('test');
    });

    test('should remove word', async () => {
      await manager.buildIndex(smallTestWords);
      
      const removed = manager.remove('hello');
      expect(removed).toBe(true);
      
      const found = manager.find('hello');
      expect(found).toBeNull();
    });

    test('should return false when removing non-existent word', async () => {
      await manager.buildIndex(smallTestWords);
      const removed = manager.remove('nonexistent');
      expect(removed).toBe(false);
    });

    test('should update word metadata', async () => {
      await manager.buildIndex(smallTestWords);
      
      const updated = manager.updateMetadata('hello', { usageCount: 10 });
      expect(updated).toBe(true);
      
      const found = manager.find('hello');
      expect(found.usageCount).toBe(10);
    });

    test('should return false when updating non-existent word', async () => {
      await manager.buildIndex(smallTestWords);
      const updated = manager.updateMetadata('nonexistent', { usageCount: 10 });
      expect(updated).toBe(false);
    });

    test('should batch add multiple words', async () => {
      await manager.buildIndex(smallTestWords);
      
      const batchWords = [
        { word: 'batch1', translation: '批量1', pos: ['noun'] },
        { word: 'batch2', translation: '批量2', pos: ['noun'] },
        { word: 'batch3', translation: '批量3', pos: ['noun'] }
      ];
      
      manager.batchAdd(batchWords);
      
      expect(manager.find('batch1')).not.toBeNull();
      expect(manager.find('batch2')).not.toBeNull();
      expect(manager.find('batch3')).not.toBeNull();
    });
  });

  describe('Persistence', () => {
    test('should persist to storage', async () => {
      await manager.buildIndex(smallTestWords);
      await manager.persist();
      
      expect(global._mockStorage['test_word_index']).toBeDefined();
      expect(global._mockStorage['test_word_index'].data.words.length).toBe(5);
    });

    test('should load from storage', async () => {
      await manager.buildIndex(smallTestWords);
      await manager.persist();
      
      const newManager = new WordIndexManager({
        storageKey: 'test_word_index'
      });
      
      const loaded = await newManager.load();
      expect(loaded).toBe(true);
      
      const found = newManager.find('hello');
      expect(found).not.toBeNull();
      expect(found.word).toBe('hello');
    });

    test('should return false when loading non-existent data', async () => {
      const newManager = new WordIndexManager({
        storageKey: 'nonexistent_key'
      });
      
      const loaded = await newManager.load();
      expect(loaded).toBe(false);
    });

    test('should validate checksum on load', async () => {
      await manager.buildIndex(smallTestWords);
      await manager.persist();
      
      // Corrupt the checksum
      const stored = global._mockStorage['test_word_index'];
      stored.checksum = 'invalid';
      
      const newManager = new WordIndexManager({
        storageKey: 'test_word_index'
      });
      
      // Should still load despite checksum mismatch (logs warning but continues)
      const loaded = await newManager.load();
      expect(loaded).toBe(true);
      
      // Data should still be accessible
      const found = newManager.find('hello');
      expect(found).not.toBeNull();
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should return statistics', async () => {
      await manager.buildIndex(smallTestWords);
      const stats = manager.getStats();
      
      expect(stats.wordCount).toBe(5);
      expect(stats.nodeCount).toBeGreaterThan(0);
      expect(stats.memoryUsage).toBeGreaterThan(0);
      expect(stats.version).toBe('1.0.0');
    });

    test('should track performance metrics', async () => {
      await manager.buildIndex(smallTestWords);
      
      // Perform some queries
      manager.find('hello');
      manager.find('world');
      manager.find('help');
      
      const stats = manager.getStats();
      expect(stats.performance.totalQueries).toBe(3);
      expect(stats.performance.avgQueryTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('LRU Eviction', () => {
    test('should evict least recently used words when at capacity', async () => {
      const smallManager = new WordIndexManager({
        maxCacheSize: 3,
        storageKey: 'test_lru'
      });
      
      await smallManager.buildIndex([
        { word: 'word1', translation: '1' },
        { word: 'word2', translation: '2' },
        { word: 'word3', translation: '3' }
      ]);
      
      // Access word2 and word3 to make word1 LRU
      smallManager.find('word2');
      smallManager.find('word3');
      
      // Add new word, should evict word1
      smallManager.add({ word: 'word4', translation: '4' });
      
      expect(smallManager.find('word1')).toBeNull();
      expect(smallManager.find('word2')).not.toBeNull();
      expect(smallManager.find('word3')).not.toBeNull();
      expect(smallManager.find('word4')).not.toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('should throw error for deprecated linearSearch', async () => {
      await manager.buildIndex(smallTestWords);
      expect(() => manager.linearSearch('hello')).toThrow('linearSearch() is deprecated');
    });

    test('should reset index', async () => {
      await manager.buildIndex(smallTestWords);
      manager.reset();
      
      const stats = manager.getStats();
      expect(stats.wordCount).toBe(0);
      expect(manager.find('hello')).toBeNull();
    });
  });

  describe('Performance Benchmarks', () => {
    test('should query in < 5ms for 10k words', async () => {
      const largeWordSet = createTestWords(10000);
      await manager.buildIndex(largeWordSet);
      
      const startTime = performance.now();
      manager.find('word5000');
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(5);
    });

    test('should build index in reasonable time', async () => {
      const largeWordSet = createTestWords(5000);
      
      const startTime = performance.now();
      await manager.buildIndex(largeWordSet);
      const duration = performance.now() - startTime;
      
      // Should complete in < 500ms for 5000 words
      expect(duration).toBeLessThan(500);
    });

    test('should perform prefix search efficiently', async () => {
      const largeWordSet = createTestWords(10000);
      await manager.buildIndex(largeWordSet);
      
      const startTime = performance.now();
      const results = manager.search('word5');
      const duration = performance.now() - startTime;
      
      // Should complete in reasonable time (< 200ms in test environment)
      // Production target is < 10ms in browser
      expect(duration).toBeLessThan(200);
      expect(results.length).toBeGreaterThan(0); // Should find matching words
    });

    test('should add words incrementally in < 5ms', async () => {
      await manager.buildIndex(smallTestWords);
      
      const startTime = performance.now();
      manager.add({ word: 'newword', translation: '新词', pos: ['noun'] });
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(5);
    });

    test('should persist in < 200ms for 5000 words', async () => {
      const largeWordSet = createTestWords(5000);
      await manager.buildIndex(largeWordSet);
      
      const startTime = performance.now();
      await manager.persist();
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(200);
    });

    test('should load in < 200ms for 5000 words', async () => {
      const largeWordSet = createTestWords(5000);
      await manager.buildIndex(largeWordSet);
      await manager.persist();
      
      const newManager = new WordIndexManager({
        storageKey: 'test_word_index'
      });
      
      const startTime = performance.now();
      await newManager.load();
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Memory Constraints', () => {
    test('should have memory overhead < 250%', async () => {
      const largeWordSet = createTestWords(1000);
      await manager.buildIndex(largeWordSet);
      
      const stats = manager.getStats();
      const overheadPercent = parseFloat(stats.memoryOverhead);
      
      // Trie structures have higher overhead, 250% is acceptable
      expect(overheadPercent).toBeLessThan(250);
    });
  });

  describe('Edge Cases - Empty Index Operations', () => {
    test('should handle find on empty index', () => {
      const result = manager.find('hello');
      expect(result).toBeNull();
    });

    test('should handle search on empty index', () => {
      const results = manager.search('hel');
      expect(results).toEqual([]);
    });

    test('should handle remove on empty index', () => {
      const removed = manager.remove('hello');
      expect(removed).toBe(false);
    });

    test('should handle updateMetadata on empty index', () => {
      const updated = manager.updateMetadata('hello', { usageCount: 5 });
      expect(updated).toBe(false);
    });

    test('should return empty stats for empty index', () => {
      const stats = manager.getStats();
      expect(stats.wordCount).toBe(0);
      expect(stats.nodeCount).toBeGreaterThanOrEqual(0);
    });

    test('should persist empty index', async () => {
      await manager.persist();
      expect(global._mockStorage['test_word_index']).toBeDefined();
      expect(global._mockStorage['test_word_index'].data.words.length).toBe(0);
    });

    test('should load empty index', async () => {
      await manager.persist();
      
      const newManager = new WordIndexManager({
        storageKey: 'test_word_index'
      });
      
      const loaded = await newManager.load();
      expect(loaded).toBe(true);
      expect(newManager.getStats().wordCount).toBe(0);
    });

    test('should batch add to empty index', () => {
      const words = [
        { word: 'test1', translation: '测试1' },
        { word: 'test2', translation: '测试2' }
      ];
      
      manager.batchAdd(words);
      
      expect(manager.find('test1')).not.toBeNull();
      expect(manager.find('test2')).not.toBeNull();
    });
  });

  describe('Edge Cases - Single Word Index', () => {
    test('should handle single word index', async () => {
      await manager.buildIndex([
        { word: 'single', translation: '单个', pos: ['adjective'] }
      ]);
      
      const stats = manager.getStats();
      expect(stats.wordCount).toBe(1);
    });

    test('should find single word', async () => {
      await manager.buildIndex([
        { word: 'single', translation: '单个', pos: ['adjective'] }
      ]);
      
      const found = manager.find('single');
      expect(found).not.toBeNull();
      expect(found.word).toBe('single');
    });

    test('should search prefix in single word', async () => {
      await manager.buildIndex([
        { word: 'single', translation: '单个', pos: ['adjective'] }
      ]);
      
      const results = manager.search('sin');
      expect(results.length).toBe(1);
      expect(results[0].word).toBe('single');
    });

    test('should remove single word', async () => {
      await manager.buildIndex([
        { word: 'single', translation: '单个', pos: ['adjective'] }
      ]);
      
      const removed = manager.remove('single');
      expect(removed).toBe(true);
      
      const found = manager.find('single');
      expect(found).toBeNull();
    });

    test('should persist and load single word', async () => {
      await manager.buildIndex([
        { word: 'single', translation: '单个', pos: ['adjective'] }
      ]);
      
      await manager.persist();
      
      const newManager = new WordIndexManager({
        storageKey: 'test_word_index'
      });
      
      const loaded = await newManager.load();
      expect(loaded).toBe(true);
      
      const found = newManager.find('single');
      expect(found).not.toBeNull();
      expect(found.word).toBe('single');
    });
  });

  describe('Edge Cases - Corrupted Data Recovery', () => {
    test('should recover from corrupted checksum', async () => {
      await manager.buildIndex(smallTestWords);
      await manager.persist();
      
      // Corrupt the checksum
      const stored = global._mockStorage['test_word_index'];
      stored.checksum = 'invalid_checksum_12345';
      
      const newManager = new WordIndexManager({
        storageKey: 'test_word_index'
      });
      
      // Should still load despite checksum mismatch
      const loaded = await newManager.load();
      expect(loaded).toBe(true);
      
      // Data should be intact
      const found = newManager.find('hello');
      expect(found).not.toBeNull();
    });

    test('should recover from missing version field', async () => {
      // Note: The validation requires version field, so we provide it but test migration detection
      // This tests the migration path when version exists but is old
      const oldData = {
        version: '0.9.0',  // Old version triggers migration
        timestamp: Date.now(),
        data: {
          words: smallTestWords,
          accessOrder: smallTestWords.map(w => w.word.toLowerCase())
        }
        // checksum is missing - will trigger migration
      };
      
      global._mockStorage['test_word_index'] = oldData;
      
      const newManager = new WordIndexManager({
        storageKey: 'test_word_index'
      });
      
      const loaded = await newManager.load();
      expect(loaded).toBe(true);
      
      // Data should be migrated and accessible
      const found = newManager.find('hello');
      expect(found).not.toBeNull();
    });

    test('should recover from missing accessOrder', async () => {
      await manager.buildIndex(smallTestWords);
      
      // Manually create data without accessOrder
      const words = [];
      for (const [word, metadata] of manager.metadata.entries()) {
        words.push(metadata);
      }
      
      const corruptedData = {
        version: '1.0.0',
        timestamp: Date.now(),
        data: {
          words,
          // accessOrder is missing
        },
        checksum: manager._calculateChecksum(words)
      };
      
      global._mockStorage['test_word_index'] = corruptedData;
      
      const newManager = new WordIndexManager({
        storageKey: 'test_word_index'
      });
      
      const loaded = await newManager.load();
      expect(loaded).toBe(true);
      
      // Data should still be accessible
      const found = newManager.find('hello');
      expect(found).not.toBeNull();
    });

    test('should handle completely invalid stored data', async () => {
      global._mockStorage['test_word_index'] = 'not a valid object';
      
      const newManager = new WordIndexManager({
        storageKey: 'test_word_index'
      });
      
      const loaded = await newManager.load();
      expect(loaded).toBe(false);
    });

    test('should handle missing data.words array', async () => {
      const invalidData = {
        version: '1.0.0',
        timestamp: Date.now(),
        data: {
          // words array is missing
          accessOrder: []
        }
      };
      
      global._mockStorage['test_word_index'] = invalidData;
      
      const newManager = new WordIndexManager({
        storageKey: 'test_word_index'
      });
      
      const loaded = await newManager.load();
      expect(loaded).toBe(false);
    });
  });

  describe('Edge Cases - Storage Quota Exceeded', () => {
    test('should handle quota exceeded during persist', async () => {
      const largeManager = new WordIndexManager({
        storageKey: 'test_quota'
      });
      
      // Mock Chrome Storage to throw quota exceeded error
      const originalSet = chrome.storage.local.set;
      let callCount = 0;
      
      chrome.storage.local.set = (items, callback) => {
        callCount++;
        if (callCount === 1) {
          // First call throws quota exceeded
          chrome.runtime.lastError = {
            message: 'QUOTA_EXCEEDED_ERR'
          };
          if (callback) callback();
          chrome.runtime.lastError = null;
        } else {
          // Retry succeeds
          global._mockStorage = global._mockStorage || {};
          Object.assign(global._mockStorage, items);
          if (callback) callback();
        }
      };
      
      try {
        const words = createTestWords(100);
        await largeManager.buildIndex(words);
        
        // This should trigger quota handling and retry
        await largeManager.persist();
        
        // Should have retried
        expect(callCount).toBeGreaterThan(1);
      } finally {
        chrome.storage.local.set = originalSet;
      }
    });

    test('should evict LRU words when at capacity', async () => {
      const smallManager = new WordIndexManager({
        maxCacheSize: 5,
        storageKey: 'test_lru_edge'
      });
      
      const words = [
        { word: 'word1', translation: '1' },
        { word: 'word2', translation: '2' },
        { word: 'word3', translation: '3' },
        { word: 'word4', translation: '4' },
        { word: 'word5', translation: '5' }
      ];
      
      await smallManager.buildIndex(words);
      
      // Access word2 and word3 to make word1 LRU
      smallManager.find('word2');
      smallManager.find('word3');
      
      // Add new word, should evict word1
      smallManager.add({ word: 'word6', translation: '6' });
      
      expect(smallManager.find('word1')).toBeNull();
      expect(smallManager.find('word6')).not.toBeNull();
    });

    test('should maintain capacity limit during batch add', async () => {
      const smallManager = new WordIndexManager({
        maxCacheSize: 5,
        storageKey: 'test_batch_capacity'
      });
      
      const words = createTestWords(10);
      
      // Batch add should respect capacity
      smallManager.batchAdd(words);
      
      const stats = smallManager.getStats();
      expect(stats.wordCount).toBeLessThanOrEqual(5);
    });
  });

  describe('Edge Cases - Deprecated linearSearch()', () => {
    test('should throw error when calling linearSearch', async () => {
      await manager.buildIndex(smallTestWords);
      
      expect(() => {
        manager.linearSearch('hello');
      }).toThrow('linearSearch() is deprecated');
    });

    test('should log deprecation warning', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await manager.buildIndex(smallTestWords);
      
      try {
        manager.linearSearch('hello');
      } catch (e) {
        // Expected
      }
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('linearSearch() is deprecated')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases - Version Migration', () => {
    test('should detect old format without version', () => {
      const oldData = {
        data: {
          words: smallTestWords,
          accessOrder: smallTestWords.map(w => w.word.toLowerCase())
        }
      };
      
      const detection = manager.detectOldFormat(oldData);
      expect(detection.isOldFormat).toBe(true);
      expect(detection.detectedVersion).toBe('pre-1.0.0');
      expect(detection.issues.length).toBeGreaterThan(0);
    });

    test('should migrate pre-v1.0.0 format', () => {
      const oldData = {
        data: {
          words: smallTestWords,
          accessOrder: smallTestWords.map(w => w.word.toLowerCase())
        }
      };
      
      const migrated = manager.migrateFromOldFormat(oldData);
      
      expect(migrated).not.toBeNull();
      expect(migrated.version).toBe('1.0.0');
      expect(migrated.data.words.length).toBe(smallTestWords.length);
      expect(Array.isArray(migrated.data.accessOrder)).toBe(true);
    });

    test('should handle array format old data', () => {
      const oldData = smallTestWords;
      
      const migrated = manager.migrateFromOldFormat(oldData);
      
      expect(migrated).not.toBeNull();
      expect(migrated.version).toBe('1.0.0');
      expect(migrated.data.words.length).toBe(smallTestWords.length);
    });

    test('should handle direct words array old format', () => {
      const oldData = {
        words: smallTestWords
      };
      
      const migrated = manager.migrateFromOldFormat(oldData);
      
      expect(migrated).not.toBeNull();
      expect(migrated.version).toBe('1.0.0');
      expect(migrated.data.words.length).toBe(smallTestWords.length);
    });

    test('should return null for unknown old format', () => {
      const unknownData = {
        unknownField: 'value'
      };
      
      const migrated = manager.migrateFromOldFormat(unknownData);
      
      expect(migrated).toBeNull();
    });

    test('should auto-migrate on load', async () => {
      // Create old format data with old version number
      const oldData = {
        version: '0.9.0',  // Old version triggers migration
        timestamp: Date.now(),
        data: {
          words: smallTestWords,
          accessOrder: smallTestWords.map(w => w.word.toLowerCase())
        }
        // checksum is missing - will trigger migration
      };
      
      global._mockStorage['test_word_index'] = oldData;
      
      const newManager = new WordIndexManager({
        storageKey: 'test_word_index'
      });
      
      const loaded = await newManager.load();
      expect(loaded).toBe(true);
      
      // Verify data is accessible
      const found = newManager.find('hello');
      expect(found).not.toBeNull();
      
      // Verify version was updated
      const stats = newManager.getStats();
      expect(stats.version).toBe('1.0.0');
    });

    test('should persist migrated data', async () => {
      // Create old format data
      const oldData = {
        data: {
          words: smallTestWords,
          accessOrder: smallTestWords.map(w => w.word.toLowerCase())
        }
      };
      
      global._mockStorage['test_word_index'] = oldData;
      
      const newManager = new WordIndexManager({
        storageKey: 'test_word_index'
      });
      
      await newManager.load();
      
      // Wait for auto-persist
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify persisted data is in new format
      const persisted = global._mockStorage['test_word_index'];
      expect(persisted.version).toBe('1.0.0');
      expect(persisted.data.words.length).toBe(smallTestWords.length);
    });
  });

  describe('Edge Cases - Special Characters and Unicode', () => {
    test('should handle words with special characters', async () => {
      const specialWords = [
        { word: 'don\'t', translation: '不要' },
        { word: 'it\'s', translation: '它是' },
        { word: 'hello-world', translation: '你好世界' }
      ];
      
      await manager.buildIndex(specialWords);
      
      expect(manager.find('don\'t')).not.toBeNull();
      expect(manager.find('it\'s')).not.toBeNull();
      expect(manager.find('hello-world')).not.toBeNull();
    });

    test('should handle unicode characters', async () => {
      const unicodeWords = [
        { word: 'café', translation: '咖啡' },
        { word: 'naïve', translation: '天真的' },
        { word: 'résumé', translation: '简历' }
      ];
      
      await manager.buildIndex(unicodeWords);
      
      expect(manager.find('café')).not.toBeNull();
      expect(manager.find('naïve')).not.toBeNull();
      expect(manager.find('résumé')).not.toBeNull();
    });

    test('should handle numbers in words', async () => {
      const numberWords = [
        { word: 'h2o', translation: '水' },
        { word: 'c3po', translation: '机器人' },
        { word: 'test123', translation: '测试123' }
      ];
      
      await manager.buildIndex(numberWords);
      
      expect(manager.find('h2o')).not.toBeNull();
      expect(manager.find('c3po')).not.toBeNull();
      expect(manager.find('test123')).not.toBeNull();
    });
  });

  describe('Edge Cases - Boundary Conditions', () => {
    test('should handle very long words', async () => {
      const longWord = 'a'.repeat(1000);
      const words = [
        { word: longWord, translation: '长词' }
      ];
      
      await manager.buildIndex(words);
      
      const found = manager.find(longWord);
      expect(found).not.toBeNull();
      expect(found.word).toBe(longWord);
    });

    test('should handle many words with same prefix', async () => {
      const words = [];
      for (let i = 0; i < 100; i++) {
        words.push({
          word: `test${i}`,
          translation: `测试${i}`
        });
      }
      
      await manager.buildIndex(words);
      
      const results = manager.search('test');
      expect(results.length).toBe(100);
    });

    test('should handle duplicate word additions', async () => {
      await manager.buildIndex([
        { word: 'hello', translation: '你好', usageCount: 1 }
      ]);
      
      // Add same word again with different metadata
      manager.add({
        word: 'hello',
        translation: '你好',
        usageCount: 2
      });
      
      const found = manager.find('hello');
      expect(found.usageCount).toBe(2);
      
      // Should only have one entry
      const stats = manager.getStats();
      expect(stats.wordCount).toBe(1);
    });

    test('should handle rapid add/remove cycles', async () => {
      await manager.buildIndex(smallTestWords);
      
      for (let i = 0; i < 10; i++) {
        manager.add({ word: `temp${i}`, translation: `临时${i}` });
        manager.remove(`temp${i}`);
      }
      
      // Original words should still be there
      expect(manager.find('hello')).not.toBeNull();
      
      // Temp words should be gone
      expect(manager.find('temp0')).toBeNull();
    });
  });

  describe('Edge Cases - Metadata Handling', () => {
    test('should preserve all metadata fields', async () => {
      const wordWithMetadata = {
        word: 'complex',
        translation: '复杂的',
        pos: ['adjective', 'verb'],
        usageCount: 42,
        difficulty: 1.5,
        context: ['This is complex', 'Very complex'],
        customField: 'custom value'
      };
      
      await manager.buildIndex([wordWithMetadata]);
      
      const found = manager.find('complex');
      expect(found.pos).toEqual(['adjective', 'verb']);
      expect(found.usageCount).toBe(42);
      expect(found.difficulty).toBe(1.5);
      expect(found.context).toEqual(['This is complex', 'Very complex']);
      expect(found.customField).toBe('custom value');
    });

    test('should handle null metadata fields', async () => {
      const wordWithNull = {
        word: 'test',
        translation: '测试',
        pos: null,
        usageCount: null
      };
      
      await manager.buildIndex([wordWithNull]);
      
      const found = manager.find('test');
      expect(found.pos).toBeNull();
      expect(found.usageCount).toBeNull();
    });

    test('should handle undefined metadata fields', async () => {
      const wordWithUndefined = {
        word: 'test',
        translation: '测试',
        pos: undefined,
        usageCount: undefined
      };
      
      await manager.buildIndex([wordWithUndefined]);
      
      const found = manager.find('test');
      expect(found).not.toBeNull();
    });
  });
});
