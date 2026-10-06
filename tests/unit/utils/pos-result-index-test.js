/**
 * Simple test file for POSResultIndex
 * Run this in a browser console or load in an HTML page
 * 
 * To run in browser:
 * 1. Open extension/utils/test-runner.html
 * 2. Open browser console
 * 3. Tests will run automatically
 */

async function runPOSResultIndexTests() {
  console.log('\n=== POSResultIndex Tests ===\n');

  // Test utilities
  function assert(condition, message) {
    if (!condition) {
      console.error('❌ FAILED:', message);
      throw new Error(message);
    }
    console.log('✅ PASSED:', message);
  }

  function assertEquals(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      console.error('❌ FAILED:', message);
      console.error('  Expected:', expected);
      console.error('  Actual:', actual);
      throw new Error(message);
    }
    console.log('✅ PASSED:', message);
  }

  // Test 1: Constructor
  console.log('Test 1: Constructor');
  const index = new POSResultIndex({
    maxEntries: 100,
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    storageKey: 'test_pos_index'
  });
  assert(index.sentenceIndex.size === 0, 'Initial sentence index should be empty');
  assert(index.wordIndex.size === 0, 'Initial word index should be empty');
  assert(index.posStats.size === 0, 'Initial POS stats should be empty');

  // Test 2: Add result
  console.log('\nTest 2: Add result');
  const sentence1 = 'The cat sits on the mat';
  const posResult1 = {
    words: [
      { word: 'The', pos: 'DET', lemma: 'the', confidence: 0.99 },
      { word: 'cat', pos: 'NOUN', lemma: 'cat', confidence: 0.95 },
      { word: 'sits', pos: 'VERB', lemma: 'sit', confidence: 0.98 },
      { word: 'on', pos: 'ADP', lemma: 'on', confidence: 0.99 },
      { word: 'the', pos: 'DET', lemma: 'the', confidence: 0.99 },
      { word: 'mat', pos: 'NOUN', lemma: 'mat', confidence: 0.96 }
    ],
    source: 'test'
  };
  
  index.addResult(sentence1, posResult1);
  assert(index.sentenceIndex.size === 1, 'Should have 1 sentence after adding');
  assert(index.wordIndex.size === 5, 'Should have 5 unique words (the, cat, sits, on, mat)');

  // Test 3: Get POS for sentence
  console.log('\nTest 3: Get POS for sentence');
  const retrieved = index.getPOSForSentence(sentence1);
  assert(retrieved !== null, 'Should retrieve POS result for sentence');
  assertEquals(retrieved.words.length, 6, 'Should have 6 words in result');

  // Test 4: Get POS for word
  console.log('\nTest 4: Get POS for word');
  const catResults = index.getPOSForWord('cat');
  assert(catResults.length === 1, 'Should find 1 sentence containing "cat"');
  assert(catResults[0].sentence === sentence1.toLowerCase(), 'Should match the sentence');

  // Test 5: Get word POS stats
  console.log('\nTest 5: Get word POS stats');
  const theStats = index.getWordPOSStats('the');
  assertEquals(theStats.counts.DET, 2, 'Word "the" should appear as DET 2 times');
  assertEquals(theStats.mostCommon, 'DET', 'Most common POS for "the" should be DET');
  assertEquals(theStats.total, 2, 'Total count for "the" should be 2');

  const catStats = index.getWordPOSStats('cat');
  assertEquals(catStats.counts.NOUN, 1, 'Word "cat" should appear as NOUN 1 time');
  assertEquals(catStats.mostCommon, 'NOUN', 'Most common POS for "cat" should be NOUN');

  // Test 6: Add another sentence with overlapping words
  console.log('\nTest 6: Add another sentence with overlapping words');
  const sentence2 = 'The dog runs fast';
  const posResult2 = {
    words: [
      { word: 'The', pos: 'DET', lemma: 'the', confidence: 0.99 },
      { word: 'dog', pos: 'NOUN', lemma: 'dog', confidence: 0.97 },
      { word: 'runs', pos: 'VERB', lemma: 'run', confidence: 0.98 },
      { word: 'fast', pos: 'ADV', lemma: 'fast', confidence: 0.95 }
    ],
    source: 'test'
  };
  
  index.addResult(sentence2, posResult2);
  assert(index.sentenceIndex.size === 2, 'Should have 2 sentences');
  
  const theResults = index.getPOSForWord('the');
  assert(theResults.length === 2, 'Word "the" should appear in 2 sentences');
  
  const updatedTheStats = index.getWordPOSStats('the');
  assertEquals(updatedTheStats.counts.DET, 3, 'Word "the" should now appear as DET 3 times');
  assertEquals(updatedTheStats.total, 3, 'Total count for "the" should be 3');

  // Test 7: Case insensitivity
  console.log('\nTest 7: Case insensitivity');
  const upperCaseResults = index.getPOSForWord('CAT');
  assert(upperCaseResults.length === 1, 'Should find "cat" regardless of case');
  
  const mixedCaseResult = index.getPOSForSentence('THE CAT SITS ON THE MAT');
  assert(mixedCaseResult !== null, 'Should find sentence regardless of case');

  // Test 8: Get stats
  console.log('\nTest 8: Get stats');
  const stats = index.getStats();
  assertEquals(stats.sentenceCount, 2, 'Should have 2 sentences in stats');
  assert(stats.wordCount >= 7, 'Should have at least 7 unique words');
  assert(stats.memoryUsage > 0, 'Memory usage should be positive');
  console.log('  Stats summary:', {
    sentences: stats.sentenceCount,
    words: stats.wordCount,
    memory: stats.memoryUsageMB + ' MB'
  });

  // Test 9: Persistence
  console.log('\nTest 9: Persistence');
  await index.persist();
  
  const newIndex = new POSResultIndex({
    maxEntries: 100,
    storageKey: 'test_pos_index'
  });
  const loaded = await newIndex.load();
  assert(loaded === true, 'Should successfully load persisted data');
  assertEquals(newIndex.sentenceIndex.size, 2, 'Loaded index should have 2 sentences');
  assertEquals(newIndex.wordIndex.size, index.wordIndex.size, 'Loaded index should have same word count');
  
  const loadedCatResults = newIndex.getPOSForWord('cat');
  assert(loadedCatResults.length === 1, 'Loaded index should find "cat"');

  // Test 10: Cleanup old entries
  console.log('\nTest 10: Cleanup old entries');
  const cleanupIndex = new POSResultIndex({
    maxEntries: 100,
    storageKey: 'test_cleanup_index'
  });
  
  // Add an old entry
  const oldSentence = 'Old sentence';
  const oldPosResult = {
    words: [
      { word: 'Old', pos: 'ADJ', lemma: 'old', confidence: 0.9 },
      { word: 'sentence', pos: 'NOUN', lemma: 'sentence', confidence: 0.95 }
    ],
    source: 'test'
  };
  cleanupIndex.addResult(oldSentence, oldPosResult);
  
  // Manually set old timestamp
  const entry = cleanupIndex.sentenceIndex.get(oldSentence.toLowerCase());
  entry.timestamp = Date.now() - (31 * 24 * 60 * 60 * 1000); // 31 days ago
  
  // Add a new entry
  cleanupIndex.addResult('New sentence', {
    words: [{ word: 'New', pos: 'ADJ', lemma: 'new', confidence: 0.9 }],
    source: 'test'
  });
  
  assertEquals(cleanupIndex.sentenceIndex.size, 2, 'Should have 2 sentences before cleanup');
  
  // Cleanup entries older than 30 days
  const removed = cleanupIndex.cleanup(30 * 24 * 60 * 60 * 1000);
  assertEquals(removed, 1, 'Should remove 1 old entry');
  assertEquals(cleanupIndex.sentenceIndex.size, 1, 'Should have 1 sentence after cleanup');
  
  const oldResult = cleanupIndex.getPOSForSentence(oldSentence);
  assert(oldResult === null, 'Old sentence should be removed');
  
  const newResult = cleanupIndex.getPOSForSentence('New sentence');
  assert(newResult !== null, 'New sentence should still exist');

  // Test 11: Reset
  console.log('\nTest 11: Reset');
  index.reset();
  assertEquals(index.sentenceIndex.size, 0, 'Sentence index should be empty after reset');
  assertEquals(index.wordIndex.size, 0, 'Word index should be empty after reset');
  assertEquals(index.posStats.size, 0, 'POS stats should be empty after reset');

  // Test 12: Performance check
  console.log('\nTest 12: Performance check');
  const perfIndex = new POSResultIndex({ storageKey: 'test_perf_index' });
  
  // Add 100 sentences
  const startTime = performance.now();
  for (let i = 0; i < 100; i++) {
    perfIndex.addResult(`Test sentence number ${i}`, {
      words: [
        { word: 'Test', pos: 'NOUN', lemma: 'test', confidence: 0.9 },
        { word: 'sentence', pos: 'NOUN', lemma: 'sentence', confidence: 0.9 },
        { word: 'number', pos: 'NOUN', lemma: 'number', confidence: 0.9 },
        { word: String(i), pos: 'NUM', lemma: String(i), confidence: 0.9 }
      ],
      source: 'test'
    });
  }
  const addTime = performance.now() - startTime;
  console.log(`  Added 100 sentences in ${addTime.toFixed(2)}ms (${(addTime/100).toFixed(2)}ms per sentence)`);
  
  // Query performance
  const queryStart = performance.now();
  for (let i = 0; i < 100; i++) {
    perfIndex.getPOSForWord('test');
  }
  const queryTime = performance.now() - queryStart;
  console.log(`  100 word queries in ${queryTime.toFixed(2)}ms (${(queryTime/100).toFixed(4)}ms per query)`);
  assert(queryTime / 100 < 1, 'Average query time should be < 1ms');

  console.log('\n=== All Tests Passed! ===\n');
  return true;
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  window.runPOSResultIndexTests = runPOSResultIndexTests;
  console.log('POSResultIndex tests loaded. Run with: runPOSResultIndexTests()');
}
