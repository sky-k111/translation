/**
 * Simple test file for WordIndexManager
 * Run this in a browser console or Node.js environment
 */

// Test data
const testWords = [
  { word: 'hello', translation: '你好', pos: ['interjection'], usageCount: 5 },
  { word: 'world', translation: '世界', pos: ['noun'], usageCount: 3 },
  { word: 'help', translation: '帮助', pos: ['verb', 'noun'], usageCount: 2 },
  { word: 'helpful', translation: '有帮助的', pos: ['adjective'], usageCount: 1 },
  { word: 'helper', translation: '助手', pos: ['noun'], usageCount: 1 }
];

async function runTests() {
  console.log('=== WordIndexManager Tests ===\n');
  
  // Initialize manager
  const manager = new WordIndexManager({
    persistDelay: 500,
    maxCacheSize: 100,
    storageKey: 'test_word_index'
  });
  
  // Test 1: Build index
  console.log('Test 1: Build Index');
  await manager.buildIndex(testWords);
  console.log('✓ Index built with', testWords.length, 'words\n');
  
  // Test 2: Find exact match
  console.log('Test 2: Find Exact Match');
  const found = manager.find('hello');
  console.log('Found:', found);
  console.assert(found && found.word === 'hello', 'Should find "hello"');
  console.log('✓ Exact match works\n');
  
  // Test 3: Case-insensitive search
  console.log('Test 3: Case-Insensitive Search');
  const foundUpper = manager.find('HELLO');
  console.log('Found (uppercase):', foundUpper);
  console.assert(foundUpper && foundUpper.word === 'hello', 'Should find "HELLO" as "hello"');
  console.log('✓ Case-insensitive search works\n');
  
  // Test 4: Prefix search
  console.log('Test 4: Prefix Search');
  const prefixResults = manager.search('hel');
  console.log('Prefix "hel" results:', prefixResults.map(w => w.word));
  console.assert(prefixResults.length === 3, 'Should find 3 words starting with "hel"');
  console.log('✓ Prefix search works\n');
  
  // Test 5: Add new word
  console.log('Test 5: Add New Word');
  manager.add({ word: 'test', translation: '测试', pos: ['noun'], usageCount: 1 });
  const foundTest = manager.find('test');
  console.log('Found new word:', foundTest);
  console.assert(foundTest && foundTest.word === 'test', 'Should find newly added "test"');
  console.log('✓ Add word works\n');
  
  // Test 6: Remove word
  console.log('Test 6: Remove Word');
  const removed = manager.remove('test');
  const notFound = manager.find('test');
  console.log('Removed:', removed, 'Found after removal:', notFound);
  console.assert(removed === true && notFound === null, 'Should remove word');
  console.log('✓ Remove word works\n');
  
  // Test 7: Update metadata
  console.log('Test 7: Update Metadata');
  const updated = manager.updateMetadata('hello', { usageCount: 10 });
  const updatedWord = manager.find('hello');
  console.log('Updated:', updated, 'New usage count:', updatedWord.usageCount);
  console.assert(updated && updatedWord.usageCount === 10, 'Should update metadata');
  console.log('✓ Update metadata works\n');
  
  // Test 8: Batch add
  console.log('Test 8: Batch Add');
  const batchWords = [
    { word: 'batch1', translation: '批量1', pos: ['noun'] },
    { word: 'batch2', translation: '批量2', pos: ['noun'] },
    { word: 'batch3', translation: '批量3', pos: ['noun'] }
  ];
  manager.batchAdd(batchWords);
  const foundBatch = manager.find('batch2');
  console.log('Found batch word:', foundBatch);
  console.assert(foundBatch && foundBatch.word === 'batch2', 'Should find batch-added word');
  console.log('✓ Batch add works\n');
  
  // Test 9: Get statistics
  console.log('Test 9: Get Statistics');
  const stats = manager.getStats();
  console.log('Stats:', stats);
  console.assert(stats.wordCount > 0, 'Should have word count');
  console.assert(stats.nodeCount > 0, 'Should have node count');
  console.log('✓ Statistics work\n');
  
  // Test 10: Deprecated linearSearch
  console.log('Test 10: Deprecated linearSearch');
  try {
    manager.linearSearch('hello');
    console.error('✗ Should have thrown error');
  } catch (error) {
    console.log('Caught expected error:', error.message);
    console.log('✓ Deprecated method throws error\n');
  }
  
  // Test 11: Persistence
  console.log('Test 11: Persistence');
  await manager.persist();
  console.log('✓ Persisted to storage\n');
  
  // Test 12: Load from storage
  console.log('Test 12: Load from Storage');
  const newManager = new WordIndexManager({
    storageKey: 'test_word_index'
  });
  const loaded = await newManager.load();
  console.log('Loaded:', loaded);
  const foundAfterLoad = newManager.find('hello');
  console.log('Found after load:', foundAfterLoad);
  console.assert(loaded && foundAfterLoad, 'Should load from storage');
  console.log('✓ Load from storage works\n');
  
  // Test 13: Reset
  console.log('Test 13: Reset');
  manager.reset();
  const statsAfterReset = manager.getStats();
  console.log('Stats after reset:', statsAfterReset);
  console.assert(statsAfterReset.wordCount === 0, 'Should have 0 words after reset');
  console.log('✓ Reset works\n');
  
  console.log('=== All Tests Passed! ===');
}

// Run tests if in browser or Node.js
if (typeof window !== 'undefined' || typeof global !== 'undefined') {
  console.log('WordIndexManager test file loaded. Run runTests() to execute tests.');
}
