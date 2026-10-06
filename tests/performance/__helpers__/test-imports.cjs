/**
 * Test script to verify imports work correctly
 */

// Mock globals
global.performance = {
  now: () => {
    const [seconds, nanoseconds] = process.hrtime();
    return seconds * 1000 + nanoseconds / 1000000;
  }
};

global.localStorage = {
  data: {},
  getItem(key) { return this.data[key] || null; },
  setItem(key, value) { this.data[key] = value; },
  removeItem(key) { delete this.data[key]; },
  clear() { this.data = {}; }
};

global.chrome = {
  storage: {
    local: {
      get: (keys, callback) => callback({}),
      set: (items, callback) => callback && callback(),
      remove: (keys, callback) => callback && callback()
    }
  },
  runtime: { lastError: null }
};

console.log('Testing imports...\n');

try {
  console.log('1. Loading Trie...');
  const { Trie } = require('../../extension/utils/trie-index.js');
  console.log('   ✓ Trie loaded:', typeof Trie);
  
  console.log('2. Loading MinHeap...');
  const { MinHeap } = require('../../extension/utils/heap.js');
  console.log('   ✓ MinHeap loaded:', typeof MinHeap);
  
  // Make them global for other modules
  global.Trie = Trie;
  global.MinHeap = MinHeap;
  
  console.log('3. Loading WordIndexManager...');
  const { WordIndexManager } = require('../../extension/utils/word-index-manager.js');
  console.log('   ✓ WordIndexManager loaded:', typeof WordIndexManager);
  
  console.log('4. Loading ReviewQueueManager...');
  const { ReviewQueueManager } = require('../../extension/utils/review-queue-manager.js');
  console.log('   ✓ ReviewQueueManager loaded:', typeof ReviewQueueManager);
  
  console.log('5. Loading POSResultIndex...');
  const { POSResultIndex } = require('../../extension/utils/pos-result-index.js');
  console.log('   ✓ POSResultIndex loaded:', typeof POSResultIndex);
  
  console.log('\n✓ All imports successful!');
  
  // Quick functionality test
  console.log('\nQuick functionality test:');
  const manager = new WordIndexManager({ storageKey: 'test' });
  console.log('   ✓ WordIndexManager instantiated');
  
  const queue = new ReviewQueueManager({ storageKey: 'test' });
  console.log('   ✓ ReviewQueueManager instantiated');
  
  const posIndex = new POSResultIndex({ storageKey: 'test' });
  console.log('   ✓ POSResultIndex instantiated');
  
  console.log('\n✓ All tests passed!');
  
} catch (error) {
  console.error('\n✗ Import failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
