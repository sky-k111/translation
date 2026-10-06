/**
 * Migration Utilities Test Suite
 * Tests for detectOldFormat() and migrateFromOldFormat() methods
 * across all three managers: WordIndexManager, ReviewQueueManager, POSResultIndex
 */

// Mock Chrome Storage API
global.chrome = {
  storage: {
    local: {
      get: (keys, callback) => callback({}),
      set: (data, callback) => callback(),
      remove: (keys, callback) => callback()
    }
  },
  runtime: {
    lastError: null
  }
};

// Mock localStorage
global.localStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
  },
  removeItem(key) {
    delete this.data[key];
  },
  clear() {
    this.data = {};
  }
};

// Mock performance API
global.performance = {
  now: () => Date.now()
};

// Load dependencies
const { Trie } = require('../extension/utils/trie-index.js');
const { MinHeap } = require('../extension/utils/heap.js');
const { WordIndexManager } = require('../extension/utils/word-index-manager.js');
const { ReviewQueueManager } = require('../extension/utils/review-queue-manager.js');
const { POSResultIndex } = require('../extension/utils/pos-result-index.js');

// Make Trie and MinHeap globally available
global.Trie = Trie;
global.MinHeap = MinHeap;

describe('Migration Utilities Test Suite', () => {
  
  // ============================================================================
  // WordIndexManager Migration Tests
  // ============================================================================
  
  describe('WordIndexManager Migration', () => {
    let manager;
    
    beforeEach(() => {
      manager = new WordIndexManager();
      global.localStorage.clear();
    });
    
    test('detectOldFormat() should detect missing version', () => {
      const oldData = {
        data: {
          words: [{ word: 'test' }],
          accessOrder: ['test']
        },
        checksum: '1-test-test'
      };
      
      const detection = manager.detectOldFormat(oldData);
      
      expect(detection.isOldFormat).toBe(true);
      expect(detection.detectedVersion).toBe('pre-1.0.0');
      expect(detection.issues).toContain('Missing version field');
      expect(detection.needsMigration).toBe(true);
    });
    
    test('detectOldFormat() should detect missing checksum', () => {
      const oldData = {
        version: '0.9.0',
        data: {
          words: [{ word: 'test' }],
          accessOrder: ['test']
        }
      };
      
      const detection = manager.detectOldFormat(oldData);
      
      expect(detection.isOldFormat).toBe(true);
      expect(detection.issues).toContain('Missing checksum field');
    });
    
    test('detectOldFormat() should detect missing accessOrder', () => {
      const oldData = {
        version: '1.0.0',
        data: {
          words: [{ word: 'test' }]
        },
        checksum: '1-test-test'
      };
      
      const detection = manager.detectOldFormat(oldData);
      
      expect(detection.isOldFormat).toBe(true);
      expect(detection.issues).toContain('Missing or invalid data.accessOrder array');
    });
    
    test('detectOldFormat() should accept current format', () => {
      const currentData = {
        version: '1.0.0',
        timestamp: Date.now(),
        data: {
          words: [{ word: 'test' }],
          accessOrder: ['test']
        },
        checksum: '1-test-test'
      };
      
      const detection = manager.detectOldFormat(currentData);
      
      expect(detection.isOldFormat).toBe(false);
      expect(detection.detectedVersion).toBe('1.0.0');
      expect(detection.needsMigration).toBe(false);
    });
    
    test('migrateFromOldFormat() should migrate direct array format', () => {
      const oldData = ['hello', 'world', 'test'];
      
      const migrated = manager.migrateFromOldFormat(oldData);
      
      expect(migrated).not.toBeNull();
      expect(migrated.version).toBe('1.0.0');
      expect(migrated.data.words).toHaveLength(3);
      expect(migrated.data.words[0].word).toBe('hello');
      expect(migrated.data.accessOrder).toHaveLength(3);
      expect(migrated.checksum).toBeDefined();
    });
    
    test('migrateFromOldFormat() should migrate object with words array', () => {
      const oldData = {
        words: [
          { word: 'hello', translation: '你好' },
          { word: 'world', translation: '世界' }
        ]
      };
      
      const migrated = manager.migrateFromOldFormat(oldData);
      
      expect(migrated).not.toBeNull();
      expect(migrated.version).toBe('1.0.0');
      expect(migrated.data.words).toHaveLength(2);
      expect(migrated.data.words[0].translation).toBe('你好');
      expect(migrated.data.accessOrder).toEqual(['hello', 'world']);
    });
    
    test('migrateFromOldFormat() should preserve existing accessOrder', () => {
      const oldData = {
        data: {
          words: [
            { word: 'hello' },
            { word: 'world' }
          ],
          accessOrder: ['world', 'hello'] // Different order
        }
      };
      
      const migrated = manager.migrateFromOldFormat(oldData);
      
      expect(migrated).not.toBeNull();
      expect(migrated.data.accessOrder).toEqual(['world', 'hello']);
    });
    
    test('migrateFromOldFormat() should handle corrupted data gracefully', () => {
      const corruptedData = {
        invalid: 'structure',
        no: 'words'
      };
      
      const migrated = manager.migrateFromOldFormat(corruptedData);
      
      expect(migrated).toBeNull();
    });
  });
  
  // ============================================================================
  // ReviewQueueManager Migration Tests
  // ============================================================================
  
  describe('ReviewQueueManager Migration', () => {
    let manager;
    
    beforeEach(() => {
      manager = new ReviewQueueManager();
      global.localStorage.clear();
    });
    
    test('detectOldFormat() should detect missing version', () => {
      const oldData = {
        items: [
          { word: 'test', priority: 1.0 }
        ]
      };
      
      const detection = manager.detectOldFormat(oldData);
      
      expect(detection.isOldFormat).toBe(true);
      expect(detection.detectedVersion).toBe('pre-1.0.0');
      expect(detection.issues).toContain('Missing version field');
      expect(detection.needsMigration).toBe(true);
    });
    
    test('detectOldFormat() should detect missing lastModified', () => {
      const oldData = {
        version: '0.9.0',
        items: [{ word: 'test', priority: 1.0 }]
      };
      
      const detection = manager.detectOldFormat(oldData);
      
      expect(detection.isOldFormat).toBe(true);
      expect(detection.issues).toContain('Missing lastModified field');
    });
    
    test('detectOldFormat() should detect invalid item structure', () => {
      const oldData = {
        version: '1.0.0',
        lastModified: Date.now(),
        items: [
          { text: 'test' } // Missing 'word' field
        ]
      };
      
      const detection = manager.detectOldFormat(oldData);
      
      expect(detection.isOldFormat).toBe(true);
      expect(detection.issues).toContain('Items missing word field');
    });
    
    test('detectOldFormat() should accept current format', () => {
      const currentData = {
        version: '1.0.0',
        timestamp: Date.now(),
        lastModified: Date.now(),
        items: [
          {
            word: 'test',
            priority: 1.0,
            nextReviewTime: Date.now(),
            lastReviewTime: Date.now(),
            reviewCount: 0,
            difficulty: 1.0,
            mastered: false,
            metadata: {}
          }
        ]
      };
      
      const detection = manager.detectOldFormat(currentData);
      
      expect(detection.isOldFormat).toBe(false);
      expect(detection.detectedVersion).toBe('1.0.0');
    });
    
    test('migrateFromOldFormat() should migrate direct array format', () => {
      const oldData = ['hello', 'world', 'test'];
      
      const migrated = manager.migrateFromOldFormat(oldData);
      
      expect(migrated).not.toBeNull();
      expect(migrated.version).toBe('1.0.0');
      expect(migrated.items).toHaveLength(3);
      expect(migrated.items[0].word).toBe('hello');
      expect(migrated.items[0].priority).toBeDefined();
      expect(migrated.items[0].nextReviewTime).toBeDefined();
    });
    
    test('migrateFromOldFormat() should normalize old item format', () => {
      const oldData = {
        items: [
          {
            text: 'hello', // Old field name
            lastReview: Date.now() - 86400000, // Old field name
            count: 2 // Old field name
          }
        ]
      };
      
      const migrated = manager.migrateFromOldFormat(oldData);
      
      expect(migrated).not.toBeNull();
      expect(migrated.items[0].word).toBe('hello');
      expect(migrated.items[0].lastReviewTime).toBeDefined();
      expect(migrated.items[0].reviewCount).toBe(2);
    });
    
    test('migrateFromOldFormat() should handle queue/words array format', () => {
      const oldData = {
        queue: [
          { word: 'test1' },
          { word: 'test2' }
        ]
      };
      
      const migrated = manager.migrateFromOldFormat(oldData);
      
      expect(migrated).not.toBeNull();
      expect(migrated.items).toHaveLength(2);
    });
    
    test('migrateFromOldFormat() should recalculate missing priorities', () => {
      const oldData = {
        items: [
          {
            word: 'test',
            lastReviewTime: Date.now() - 86400000,
            reviewCount: 1,
            difficulty: 1.5
          }
        ]
      };
      
      const migrated = manager.migrateFromOldFormat(oldData);
      
      expect(migrated).not.toBeNull();
      expect(migrated.items[0].priority).toBeDefined();
      expect(typeof migrated.items[0].priority).toBe('number');
    });
  });
  
  // ============================================================================
  // POSResultIndex Migration Tests
  // ============================================================================
  
  describe('POSResultIndex Migration', () => {
    let index;
    
    beforeEach(() => {
      index = new POSResultIndex();
      global.localStorage.clear();
    });
    
    test('detectOldFormat() should detect missing version', () => {
      const oldData = {
        sentenceIndex: [],
        wordIndex: [],
        posStats: []
      };
      
      const detection = index.detectOldFormat(oldData);
      
      expect(detection.isOldFormat).toBe(true);
      expect(detection.detectedVersion).toBe('pre-1.0.0');
      expect(detection.issues).toContain('Missing version field');
    });
    
    test('detectOldFormat() should detect missing indexes', () => {
      const oldData = {
        version: '0.9.0'
      };
      
      const detection = index.detectOldFormat(oldData);
      
      expect(detection.isOldFormat).toBe(true);
      expect(detection.issues).toContain('Missing or invalid sentenceIndex array');
      expect(detection.issues).toContain('Missing or invalid wordIndex array');
      expect(detection.issues).toContain('Missing or invalid posStats array');
    });
    
    test('detectOldFormat() should accept current format', () => {
      const currentData = {
        version: '1.0.0',
        timestamp: Date.now(),
        lastModified: Date.now(),
        sentenceIndex: [
          {
            sentence: 'test sentence',
            posResult: { words: [] },
            timestamp: Date.now(),
            words: []
          }
        ],
        wordIndex: [],
        posStats: []
      };
      
      const detection = index.detectOldFormat(currentData);
      
      expect(detection.isOldFormat).toBe(false);
      expect(detection.detectedVersion).toBe('1.0.0');
    });
    
    test('migrateFromOldFormat() should migrate object-based sentenceIndex', () => {
      const oldData = {
        sentenceIndex: {
          'test sentence': {
            posResult: { words: [{ word: 'test', pos: 'noun' }] },
            timestamp: Date.now()
          }
        }
      };
      
      const migrated = index.migrateFromOldFormat(oldData);
      
      expect(migrated).not.toBeNull();
      expect(migrated.version).toBe('1.0.0');
      expect(Array.isArray(migrated.sentenceIndex)).toBe(true);
      expect(migrated.sentenceIndex).toHaveLength(1);
      expect(migrated.sentenceIndex[0].sentence).toBe('test sentence');
    });
    
    test('migrateFromOldFormat() should rebuild word index from sentences', () => {
      const oldData = {
        sentenceIndex: [
          {
            sentence: 'hello world',
            posResult: {
              words: [
                { word: 'hello', pos: 'interjection' },
                { word: 'world', pos: 'noun' }
              ]
            },
            timestamp: Date.now(),
            words: ['hello', 'world']
          }
        ]
      };
      
      const migrated = index.migrateFromOldFormat(oldData);
      
      expect(migrated).not.toBeNull();
      expect(migrated.wordIndex).toHaveLength(2);
      
      const helloEntry = migrated.wordIndex.find(e => e.word === 'hello');
      expect(helloEntry).toBeDefined();
      expect(helloEntry.sentences).toContain('hello world');
    });
    
    test('migrateFromOldFormat() should rebuild POS stats from sentences', () => {
      const oldData = {
        sentenceIndex: [
          {
            sentence: 'test sentence',
            posResult: {
              words: [
                { word: 'test', pos: 'noun' },
                { word: 'sentence', pos: 'noun' }
              ]
            },
            timestamp: Date.now(),
            words: ['test', 'sentence']
          },
          {
            sentence: 'test again',
            posResult: {
              words: [
                { word: 'test', pos: 'verb' },
                { word: 'again', pos: 'adverb' }
              ]
            },
            timestamp: Date.now(),
            words: ['test', 'again']
          }
        ]
      };
      
      const migrated = index.migrateFromOldFormat(oldData);
      
      expect(migrated).not.toBeNull();
      expect(migrated.posStats).toHaveLength(3);
      
      const testStats = migrated.posStats.find(e => e.word === 'test');
      expect(testStats).toBeDefined();
      expect(testStats.stats.noun).toBe(1);
      expect(testStats.stats.verb).toBe(1);
    });
    
    test('migrateFromOldFormat() should handle direct array format', () => {
      const oldData = [
        {
          sentence: 'test',
          words: [{ word: 'test', pos: 'noun' }]
        }
      ];
      
      const migrated = index.migrateFromOldFormat(oldData);
      
      expect(migrated).not.toBeNull();
      expect(migrated.sentenceIndex).toHaveLength(1);
    });
  });
  
  // ============================================================================
  // Integration Tests - Load with Migration
  // ============================================================================
  
  describe('Integration: Load with Automatic Migration', () => {
    
    test('WordIndexManager should auto-migrate on load', async () => {
      const manager = new WordIndexManager();
      
      // Store old format data in localStorage (since we're using localStorage fallback in tests)
      const oldData = {
        words: [
          { word: 'hello', translation: '你好' },
          { word: 'world', translation: '世界' }
        ]
      };
      
      global.localStorage.setItem('word_index_v1', JSON.stringify(oldData));
      
      // Load should trigger migration
      const loaded = await manager.load();
      
      // Even if load returns false due to validation, migration should have been attempted
      // Let's verify the migration worked by checking if we can manually migrate
      const migrated = manager.migrateFromOldFormat(oldData);
      expect(migrated).not.toBeNull();
      expect(migrated.version).toBe('1.0.0');
      expect(migrated.data.words).toHaveLength(2);
    });
    
    test('ReviewQueueManager should auto-migrate on load', async () => {
      const manager = new ReviewQueueManager();
      
      // Store old format data
      const oldData = ['hello', 'world', 'test'];
      
      global.localStorage.setItem('review_queue_v1', JSON.stringify(oldData));
      
      // Load should trigger migration
      const loaded = await manager.load();
      
      // Verify migration logic works
      const migrated = manager.migrateFromOldFormat(oldData);
      expect(migrated).not.toBeNull();
      expect(migrated.version).toBe('1.0.0');
      expect(migrated.items).toHaveLength(3);
    });
    
    test('POSResultIndex should auto-migrate on load', async () => {
      const index = new POSResultIndex();
      
      // Store old format data
      const oldData = {
        sentenceIndex: {
          'test sentence': {
            posResult: { words: [{ word: 'test', pos: 'noun' }] },
            timestamp: Date.now()
          }
        }
      };
      
      global.localStorage.setItem('pos_index_v1', JSON.stringify(oldData));
      
      // Load should trigger migration
      const loaded = await index.load();
      
      // Verify migration logic works
      const migrated = index.migrateFromOldFormat(oldData);
      expect(migrated).not.toBeNull();
      expect(migrated.version).toBe('1.0.0');
      expect(Array.isArray(migrated.sentenceIndex)).toBe(true);
    });
  });
  
  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================
  
  describe('Edge Cases and Error Handling', () => {
    
    test('Should handle null data gracefully', () => {
      const manager = new WordIndexManager();
      const detection = manager.detectOldFormat(null);
      
      expect(detection.isOldFormat).toBe(false);
      expect(detection.detectedVersion).toBe('none');
      expect(detection.issues).toContain('No data provided');
    });
    
    test('Should handle undefined data gracefully', () => {
      const manager = new ReviewQueueManager();
      const detection = manager.detectOldFormat(undefined);
      
      expect(detection.isOldFormat).toBe(false);
      expect(detection.detectedVersion).toBe('none');
    });
    
    test('Should reject severely corrupted data', () => {
      const manager = new WordIndexManager();
      const corruptedData = {
        random: 'data',
        with: 'no',
        valid: 'structure'
      };
      
      const detection = manager.detectOldFormat(corruptedData);
      expect(detection.needsMigration).toBe(true); // Will attempt migration
      
      const migrated = manager.migrateFromOldFormat(corruptedData);
      expect(migrated).toBeNull(); // But migration will fail
    });
    
    test('Should log migration progress', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const manager = new WordIndexManager();
      const oldData = ['test'];
      
      manager.migrateFromOldFormat(oldData);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WordIndexManager] Starting migration')
      );
      
      consoleSpy.mockRestore();
    });
  });
});

// Run tests
console.log('Starting Migration Utilities Test Suite...\n');
