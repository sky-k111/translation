#!/usr/bin/env node

/**
 * Benchmark Runner
 * Runs all performance benchmarks and generates comparison reports
 * 
 * Usage:
 *   node tests/benchmarks/run-benchmarks.js
 *   node tests/benchmarks/run-benchmarks.js --suite=word-index
 *   node tests/benchmarks/run-benchmarks.js --iterations=1000
 *   node tests/benchmarks/run-benchmarks.js --output=results/benchmark.json
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { performance } from 'perf_hooks';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Make performance available globally
global.performance = performance;

// Mock Chrome Storage API for Node.js
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

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  suite: null,
  iterations: 100,
  output: null,
  verbose: true
};

for (const arg of args) {
  if (arg.startsWith('--suite=')) {
    options.suite = arg.split('=')[1];
  } else if (arg.startsWith('--iterations=')) {
    options.iterations = parseInt(arg.split('=')[1]);
  } else if (arg.startsWith('--output=')) {
    options.output = arg.split('=')[1];
  } else if (arg === '--quiet') {
    options.verbose = false;
  }
}

// Import modules
const { BenchmarkFramework } = await import('./framework.js');
const {
  generateWords,
  generateReviewItems,
  generatePOSResults,
  generateSearchQueries
} = await import('./data-generators.js');
const {
  LinearSearchIndex,
  ArraySortQueue,
  IterationPOSIndex,
  SimpleMapIndex
} = await import('./baseline-implementations.js');

// Import optimized implementations (CommonJS modules)
const { Trie } = require('../../extension/utils/trie-index.js');
const { MinHeap } = require('../../extension/utils/heap.js');
const { WordIndexManager } = require('../../extension/utils/word-index-manager.js');
const { ReviewQueueManager } = require('../../extension/utils/review-queue-manager.js');
const { POSResultIndex } = require('../../extension/utils/pos-result-index.js');

// Make Trie and MinHeap available globally
global.Trie = Trie;
global.MinHeap = MinHeap;

/**
 * Run Word Index benchmarks
 */
async function runWordIndexBenchmarks(framework) {
  if (options.suite && options.suite !== 'word-index') return;

  framework.suite('Word Index Benchmarks');

  // Generate test data
  const words10k = generateWords(10000);
  const searchQueries = generateSearchQueries(words10k, 100);

  // Test 1: Word Lookup (10k words)
  console.log('Preparing Word Lookup benchmark (10,000 words)...');
  
  const linearIndex = new LinearSearchIndex();
  linearIndex.buildIndex(words10k);
  
  const trieManager = new WordIndexManager({ storageKey: 'bench_word_index' });
  await trieManager.buildIndex(words10k);

  const baselineResult = await framework.test(
    'Linear Search - Word Lookup',
    () => {
      const target = words10k[Math.floor(Math.random() * words10k.length)].word;
      linearIndex.find(target);
    }
  );

  const optimizedResult = await framework.test(
    'Trie Search - Word Lookup',
    () => {
      const target = words10k[Math.floor(Math.random() * words10k.length)].word;
      trieManager.find(target);
    }
  );

  framework.compare(
    'Word Lookup (10k words)',
    baselineResult,
    optimizedResult,
    10 // Target: 10x improvement
  );

  // Test 2: Prefix Search (10k words)
  console.log('Preparing Prefix Search benchmark...');

  const baselinePrefixResult = await framework.test(
    'Linear Filter - Prefix Search',
    () => {
      const prefix = searchQueries[Math.floor(Math.random() * searchQueries.length)];
      linearIndex.search(prefix);
    }
  );

  const optimizedPrefixResult = await framework.test(
    'Trie Search - Prefix Search',
    () => {
      const prefix = searchQueries[Math.floor(Math.random() * searchQueries.length)];
      trieManager.search(prefix);
    }
  );

  framework.compare(
    'Prefix Search (10k words)',
    baselinePrefixResult,
    optimizedPrefixResult,
    10 // Target: 10x improvement
  );

  // Test 3: Incremental Add (10k words already in index)
  console.log('Preparing Incremental Add benchmark...');

  const newWords = generateWords(100);

  const baselineAddResult = await framework.test(
    'Linear Search - Add Word',
    () => {
      const word = newWords[Math.floor(Math.random() * newWords.length)];
      linearIndex.add(word);
    },
    { iterations: 50 }
  );

  const optimizedAddResult = await framework.test(
    'Trie Manager - Add Word',
    () => {
      const word = newWords[Math.floor(Math.random() * newWords.length)];
      trieManager.add(word);
    },
    { iterations: 50 }
  );

  framework.compare(
    'Incremental Add',
    baselineAddResult,
    optimizedAddResult,
    1 // No specific target, just comparison
  );

  // Cleanup
  trieManager.reset();

  framework.endSuite();
}

/**
 * Run Review Queue benchmarks
 */
async function runReviewQueueBenchmarks(framework) {
  if (options.suite && options.suite !== 'review-queue') return;

  framework.suite('Review Queue Benchmarks');

  // Generate test data
  const reviewItems500 = generateReviewItems(500);

  // Test 1: Extract Min (500 items)
  console.log('Preparing Extract Min benchmark (500 items)...');

  const arrayQueue = new ArraySortQueue();
  arrayQueue.batchAdd(reviewItems500);

  const heapQueue = new ReviewQueueManager({ storageKey: 'bench_review_queue' });
  heapQueue.batchAdd(reviewItems500);

  const baselineExtractResult = await framework.test(
    'Array Sort - Extract Min',
    () => {
      const item = arrayQueue.getNextReview();
      if (item) {
        arrayQueue.addWord(item); // Add back to maintain queue size
      }
    }
  );

  const optimizedExtractResult = await framework.test(
    'MinHeap - Extract Min',
    () => {
      const item = heapQueue.getNextReview();
      if (item) {
        heapQueue.addWord(item); // Add back to maintain queue size
      }
    }
  );

  framework.compare(
    'Extract Min (500 items)',
    baselineExtractResult,
    optimizedExtractResult,
    10 // Target: 10x improvement
  );

  // Test 2: Add Word (500 items in queue)
  console.log('Preparing Add Word benchmark...');

  const newReviewItems = generateReviewItems(100);

  const baselineAddResult = await framework.test(
    'Array Sort - Add Word',
    () => {
      const item = newReviewItems[Math.floor(Math.random() * newReviewItems.length)];
      arrayQueue.addWord(item);
    },
    { iterations: 50 }
  );

  const optimizedAddResult = await framework.test(
    'MinHeap - Add Word',
    () => {
      const item = newReviewItems[Math.floor(Math.random() * newReviewItems.length)];
      heapQueue.addWord(item);
    },
    { iterations: 50 }
  );

  framework.compare(
    'Add Word (500 items)',
    baselineAddResult,
    optimizedAddResult,
    5 // Target: 5x improvement (less critical than extract)
  );

  // Test 3: Update After Review
  console.log('Preparing Update After Review benchmark...');

  const baselineUpdateResult = await framework.test(
    'Array Sort - Update After Review',
    () => {
      const item = reviewItems500[Math.floor(Math.random() * reviewItems500.length)];
      arrayQueue.updateAfterReview(item.word, Math.random() < 0.7);
    },
    { iterations: 50 }
  );

  const optimizedUpdateResult = await framework.test(
    'MinHeap - Update After Review',
    () => {
      const item = reviewItems500[Math.floor(Math.random() * reviewItems500.length)];
      heapQueue.updateAfterReview(item.word, Math.random() < 0.7);
    },
    { iterations: 50 }
  );

  framework.compare(
    'Update After Review',
    baselineUpdateResult,
    optimizedUpdateResult,
    5 // Target: 5x improvement
  );

  // Cleanup
  heapQueue.reset();

  framework.endSuite();
}

/**
 * Run POS Index benchmarks
 */
async function runPOSIndexBenchmarks(framework) {
  if (options.suite && options.suite !== 'pos-index') return;

  framework.suite('POS Index Benchmarks');

  // Generate test data
  const posResults1k = generatePOSResults(1000);

  // Test 1: Word Lookup (1000 sentences)
  console.log('Preparing POS Word Lookup benchmark (1,000 sentences)...');

  const iterationIndex = new IterationPOSIndex();
  for (const result of posResults1k) {
    iterationIndex.addResult(result.sentence, result.posResult);
  }

  const hashIndex = new POSResultIndex({ storageKey: 'bench_pos_index' });
  for (const result of posResults1k) {
    hashIndex.addResult(result.sentence, result.posResult);
  }

  // Extract some words for testing
  const testWords = posResults1k
    .slice(0, 100)
    .flatMap(r => r.posResult.words.map(w => w.word))
    .filter((w, i, arr) => arr.indexOf(w) === i)
    .slice(0, 50);

  const baselineWordLookupResult = await framework.test(
    'Iteration - Word Lookup',
    () => {
      const word = testWords[Math.floor(Math.random() * testWords.length)];
      iterationIndex.getPOSForWord(word);
    }
  );

  const optimizedWordLookupResult = await framework.test(
    'Hash Index - Word Lookup',
    () => {
      const word = testWords[Math.floor(Math.random() * testWords.length)];
      hashIndex.getPOSForWord(word);
    }
  );

  framework.compare(
    'POS Word Lookup (1k sentences)',
    baselineWordLookupResult,
    optimizedWordLookupResult,
    100 // Target: 100x improvement
  );

  // Test 2: Sentence Lookup
  console.log('Preparing POS Sentence Lookup benchmark...');

  const testSentences = posResults1k.slice(0, 100).map(r => r.sentence);

  const baselineSentenceLookupResult = await framework.test(
    'Iteration - Sentence Lookup',
    () => {
      const sentence = testSentences[Math.floor(Math.random() * testSentences.length)];
      iterationIndex.getPOSForSentence(sentence);
    }
  );

  const optimizedSentenceLookupResult = await framework.test(
    'Hash Index - Sentence Lookup',
    () => {
      const sentence = testSentences[Math.floor(Math.random() * testSentences.length)];
      hashIndex.getPOSForSentence(sentence);
    }
  );

  framework.compare(
    'POS Sentence Lookup (1k sentences)',
    baselineSentenceLookupResult,
    optimizedSentenceLookupResult,
    100 // Target: 100x improvement
  );

  // Test 3: POS Statistics
  console.log('Preparing POS Statistics benchmark...');

  const baselineStatsResult = await framework.test(
    'Iteration - POS Statistics',
    () => {
      const word = testWords[Math.floor(Math.random() * testWords.length)];
      iterationIndex.getWordPOSStats(word);
    }
  );

  const optimizedStatsResult = await framework.test(
    'Hash Index - POS Statistics',
    () => {
      const word = testWords[Math.floor(Math.random() * testWords.length)];
      hashIndex.getWordPOSStats(word);
    }
  );

  framework.compare(
    'POS Statistics',
    baselineStatsResult,
    optimizedStatsResult,
    50 // Target: 50x improvement
  );

  // Cleanup
  hashIndex.reset();

  framework.endSuite();
}

/**
 * Main benchmark runner
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Data Structure Optimization Benchmarks');
  console.log('='.repeat(60));
  console.log();
  console.log(`Iterations per test: ${options.iterations}`);
  console.log(`Suite filter: ${options.suite || 'all'}`);
  console.log();

  const framework = new BenchmarkFramework({
    iterations: options.iterations,
    verbose: options.verbose
  });

  try {
    // Run benchmark suites
    await runWordIndexBenchmarks(framework);
    await runReviewQueueBenchmarks(framework);
    await runPOSIndexBenchmarks(framework);

    // Print summary
    const summary = framework.printSummary();

    // Export results if requested
    if (options.output) {
      await framework.exportJSON(options.output);
    }

    // Exit with appropriate code
    process.exit(summary.allPassed ? 0 : 1);
  } catch (error) {
    console.error('Benchmark execution failed:', error);
    process.exit(1);
  }
}

// Run benchmarks
main();
