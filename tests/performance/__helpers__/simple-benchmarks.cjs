#!/usr/bin/env node

/**
 * Simple Benchmark Script
 * Direct comparison of data structures without complex module loading
 */

const { performance } = require('perf_hooks');
const { generateWords, generateReviewItems, generatePOSResults } = require('./data-generators.cjs');
const { LinearSearchIndex, ArraySortQueue, IterationPOSIndex } = require('./baseline-implementations.cjs');

// Mock Chrome API
global.chrome = {
  storage: { local: { get: (k, cb) => cb({}), set: (i, cb) => cb && cb() } },
  runtime: { lastError: null }
};
global.localStorage = {
  data: {},
  getItem(k) { return this.data[k] || null; },
  setItem(k, v) { this.data[k] = v; },
  removeItem(k) { delete this.data[k]; },
  clear() { this.data = {}; }
};

// Load Trie and Heap directly
const { Trie } = require('../../extension/utils/trie-index.js');
const { MinHeap } = require('../../extension/utils/heap.js');

console.log('='.repeat(70));
console.log('Data Structure Optimization - Simple Benchmarks');
console.log('='.repeat(70));
console.log();

/**
 * Run benchmark
 */
function benchmark(name, fn, iterations = 100) {
  // Warmup
  for (let i = 0; i < 10; i++) fn();
  
  // Measure
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    times.push(end - start);
  }
  
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const sorted = times.sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  
  return { name, mean, median, min: sorted[0], max: sorted[sorted.length - 1] };
}

/**
 * Test 1: Word Index - Trie vs Linear Search
 */
console.log('Test 1: Word Lookup (10,000 words)');
console.log('-'.repeat(70));

const words10k = generateWords(10000);

// Build indexes
const linearIndex = new LinearSearchIndex();
linearIndex.buildIndex(words10k);

const trie = new Trie();
words10k.forEach(w => trie.insert(w.word.toLowerCase(), w));

// Benchmark lookups
const linearResult = benchmark('Linear Search', () => {
  const target = words10k[Math.floor(Math.random() * words10k.length)].word;
  linearIndex.find(target);
});

const trieResult = benchmark('Trie Search', () => {
  const target = words10k[Math.floor(Math.random() * words10k.length)].word;
  trie.search(target.toLowerCase());
});

console.log(`  Linear Search: ${linearResult.mean.toFixed(4)}ms (median: ${linearResult.median.toFixed(4)}ms)`);
console.log(`  Trie Search:   ${trieResult.mean.toFixed(4)}ms (median: ${trieResult.median.toFixed(4)}ms)`);

const improvement1 = linearResult.mean / trieResult.mean;
const passed1 = improvement1 >= 10;
console.log(`  Improvement:   ${improvement1.toFixed(2)}x ${passed1 ? '✓ PASS' : '✗ FAIL'} (target: 10x)`);
console.log();

/**
 * Test 2: Prefix Search
 */
console.log('Test 2: Prefix Search (10,000 words)');
console.log('-'.repeat(70));

const prefixes = ['he', 'wo', 'ti', 'pe', 'wa'];

const linearPrefixResult = benchmark('Linear Filter', () => {
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  linearIndex.search(prefix);
});

const triePrefixResult = benchmark('Trie Prefix Search', () => {
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  trie.startsWith(prefix.toLowerCase());
});

console.log(`  Linear Filter:      ${linearPrefixResult.mean.toFixed(4)}ms`);
console.log(`  Trie Prefix Search: ${triePrefixResult.mean.toFixed(4)}ms`);

const improvement2 = linearPrefixResult.mean / triePrefixResult.mean;
const passed2 = improvement2 >= 10;
console.log(`  Improvement:        ${improvement2.toFixed(2)}x ${passed2 ? '✓ PASS' : '✗ FAIL'} (target: 10x)`);
console.log();

/**
 * Test 3: Review Queue - Heap vs Array Sort
 */
console.log('Test 3: Priority Queue Extract Min (500 items)');
console.log('-'.repeat(70));

const reviewItems500 = generateReviewItems(500);

// Build queues
const arrayQueue = new ArraySortQueue();
arrayQueue.batchAdd(reviewItems500);

const heap = new MinHeap((a, b) => a.priority - b.priority);
reviewItems500.forEach(item => {
  const priority = arrayQueue.calculatePriority(item);
  heap.insert({ ...item, priority });
});

// Benchmark extract
const arrayExtractResult = benchmark('Array Sort Extract', () => {
  const item = arrayQueue.getNextReview();
  if (item) arrayQueue.addWord(item);
}, 50);

const heapExtractResult = benchmark('Heap Extract', () => {
  const item = heap.extractMin();
  if (item) heap.insert(item);
}, 50);

console.log(`  Array Sort Extract: ${arrayExtractResult.mean.toFixed(4)}ms`);
console.log(`  Heap Extract:       ${heapExtractResult.mean.toFixed(4)}ms`);

const improvement3 = arrayExtractResult.mean / heapExtractResult.mean;
const passed3 = improvement3 >= 10;
console.log(`  Improvement:        ${improvement3.toFixed(2)}x ${passed3 ? '✓ PASS' : '✗ FAIL'} (target: 10x)`);
console.log();

/**
 * Test 4: POS Index - Hash vs Iteration
 */
console.log('Test 4: POS Word Lookup (1,000 sentences)');
console.log('-'.repeat(70));

const posResults1k = generatePOSResults(1000);

// Build indexes
const iterationIndex = new IterationPOSIndex();
posResults1k.forEach(r => iterationIndex.addResult(r.sentence, r.posResult));

const hashIndex = {
  wordIndex: new Map(),
  sentenceIndex: new Map(),
  
  addResult(sentence, posResult) {
    const normalized = sentence.trim().toLowerCase();
    this.sentenceIndex.set(normalized, posResult);
    
    (posResult.words || []).forEach(w => {
      const word = w.word.toLowerCase();
      if (!this.wordIndex.has(word)) {
        this.wordIndex.set(word, []);
      }
      this.wordIndex.get(word).push({ sentence: normalized, posResult });
    });
  },
  
  getPOSForWord(word) {
    return this.wordIndex.get(word.toLowerCase()) || [];
  }
};

posResults1k.forEach(r => hashIndex.addResult(r.sentence, r.posResult));

// Extract test words
const testWords = posResults1k
  .slice(0, 100)
  .flatMap(r => r.posResult.words.map(w => w.word))
  .filter((w, i, arr) => arr.indexOf(w) === i)
  .slice(0, 50);

// Benchmark lookups
const iterationLookupResult = benchmark('Iteration Lookup', () => {
  const word = testWords[Math.floor(Math.random() * testWords.length)];
  iterationIndex.getPOSForWord(word);
});

const hashLookupResult = benchmark('Hash Index Lookup', () => {
  const word = testWords[Math.floor(Math.random() * testWords.length)];
  hashIndex.getPOSForWord(word);
});

console.log(`  Iteration Lookup:  ${iterationLookupResult.mean.toFixed(4)}ms`);
console.log(`  Hash Index Lookup: ${hashLookupResult.mean.toFixed(4)}ms`);

const improvement4 = iterationLookupResult.mean / hashLookupResult.mean;
const passed4 = improvement4 >= 100;
console.log(`  Improvement:       ${improvement4.toFixed(2)}x ${passed4 ? '✓ PASS' : '✗ FAIL'} (target: 100x)`);
console.log();

/**
 * Summary
 */
console.log('='.repeat(70));
console.log('Summary');
console.log('='.repeat(70));
console.log();

const results = [
  { name: 'Word Lookup (Trie)', improvement: improvement1, target: 10, passed: passed1 },
  { name: 'Prefix Search (Trie)', improvement: improvement2, target: 10, passed: passed2 },
  { name: 'Queue Extract (Heap)', improvement: improvement3, target: 10, passed: passed3 },
  { name: 'POS Lookup (Hash)', improvement: improvement4, target: 100, passed: passed4 }
];

results.forEach(r => {
  const status = r.passed ? '✓' : '✗';
  console.log(`${status} ${r.name}: ${r.improvement.toFixed(2)}x (target: ${r.target}x)`);
});

console.log();

const allPassed = results.every(r => r.passed);
if (allPassed) {
  console.log('✓ All benchmarks passed performance targets!');
  process.exit(0);
} else {
  const failedCount = results.filter(r => !r.passed).length;
  console.log(`✗ ${failedCount} benchmark(s) failed to meet targets`);
  process.exit(1);
}
