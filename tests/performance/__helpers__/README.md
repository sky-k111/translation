# Benchmark Infrastructure

This directory contains performance benchmarking infrastructure for the data structure optimization feature.

## Overview

The benchmark suite compares optimized data structures (Trie, MinHeap, POS Index) against baseline implementations (linear search, array sort, iteration) to verify 10-100x performance improvements.

## Structure

```
tests/benchmarks/
├── README.md                    # This file
├── framework.js                 # Benchmark framework (timing, reporting)
├── data-generators.js           # Test data generators
├── baseline-implementations.js  # Baseline algorithms for comparison
├── run-benchmarks.js           # Main benchmark runner
└── results/                     # Benchmark results (generated)
```

## Running Benchmarks

```bash
# Run all benchmarks
node tests/benchmarks/run-benchmarks.js

# Run specific benchmark
node tests/benchmarks/run-benchmarks.js --suite=word-index

# Run with custom iterations
node tests/benchmarks/run-benchmarks.js --iterations=1000

# Save results to file
node tests/benchmarks/run-benchmarks.js --output=results/benchmark-$(date +%Y%m%d).json
```

## Benchmark Suites

### 1. Word Index Benchmarks
- **Trie vs Linear Search**: Word lookup performance (10k words)
- **Prefix Search**: Prefix matching performance
- **Incremental Updates**: Add/remove operations

**Target**: 10x improvement over linear search

### 2. Review Queue Benchmarks
- **Heap vs Array Sort**: Priority queue operations (500 words)
- **Extract Min**: Get next review item
- **Priority Updates**: Update after review

**Target**: 10x improvement over array sorting

### 3. POS Index Benchmarks
- **Hash Index vs Iteration**: POS result lookup
- **Word Statistics**: POS statistics calculation
- **Bidirectional Lookup**: Sentence and word queries

**Target**: 100x improvement over iteration

## Performance Targets

| Operation | Baseline | Optimized | Target Improvement |
|-----------|----------|-----------|-------------------|
| Word query (10k words) | 50ms | 5ms | 10x |
| Prefix search (10k words) | 100ms | 10ms | 10x |
| Review queue extract (500 words) | 20ms | 2ms | 10x |
| POS lookup | 10ms | 0.1ms | 100x |

## Data Generators

### Word Generator
Generates realistic word data with:
- English words (random or from dictionary)
- Translations
- POS tags
- Usage counts
- Metadata

### Review Item Generator
Generates review queue items with:
- Review history
- Difficulty levels
- Timestamps
- Priority scores

### POS Result Generator
Generates POS analysis results with:
- Sentences
- Word-level analysis
- POS tags
- Confidence scores

## Baseline Implementations

### Linear Search
Simple array iteration for word lookup:
```javascript
function linearSearch(words, target) {
  for (const word of words) {
    if (word.word === target) return word;
  }
  return null;
}
```

### Array Sort
Array sorting for priority queue:
```javascript
function arraySort(items) {
  items.sort((a, b) => a.priority - b.priority);
  return items.shift();
}
```

### Iteration
Full iteration for POS lookup:
```javascript
function iterationSearch(results, word) {
  const matches = [];
  for (const result of results) {
    if (result.words.includes(word)) {
      matches.push(result);
    }
  }
  return matches;
}
```

## Framework Features

- **Precise Timing**: Uses `performance.now()` for microsecond precision
- **Warmup Runs**: Eliminates JIT compilation effects
- **Statistical Analysis**: Mean, median, min, max, standard deviation
- **Comparison Reports**: Side-by-side comparison with improvement ratios
- **Memory Profiling**: Tracks memory usage (when available)
- **JSON Export**: Results can be exported for analysis

## Example Output

```
=== Word Index Benchmarks ===

Test: Word Lookup (10,000 words)
  Linear Search:  52.34ms (avg over 100 runs)
  Trie Search:     4.12ms (avg over 100 runs)
  Improvement:    12.7x faster ✓

Test: Prefix Search (10,000 words, prefix "hel")
  Linear Filter:  98.45ms (avg over 100 runs)
  Trie Search:     8.23ms (avg over 100 runs)
  Improvement:    12.0x faster ✓

=== Review Queue Benchmarks ===

Test: Extract Min (500 items)
  Array Sort:     18.67ms (avg over 100 runs)
  MinHeap:         1.45ms (avg over 100 runs)
  Improvement:    12.9x faster ✓

=== POS Index Benchmarks ===

Test: Word Lookup (1,000 sentences)
  Iteration:       9.87ms (avg over 100 runs)
  Hash Index:      0.08ms (avg over 100 runs)
  Improvement:   123.4x faster ✓

=== Summary ===
✓ All benchmarks passed performance targets
  - Word Index: 12.7x improvement (target: 10x)
  - Review Queue: 12.9x improvement (target: 10x)
  - POS Index: 123.4x improvement (target: 100x)
```

## Requirements Validation

This benchmark infrastructure validates:
- **Requirement 11.1**: Word query performance tests
- **Requirement 11.2**: Prefix search performance tests
- **Requirement 11.3**: Review queue operation tests
- **Requirement 11.4**: POS index query tests
- **Requirement 11.5**: 10x improvement for Trie
- **Requirement 11.6**: 10x improvement for Heap
- **Requirement 11.7**: 100x improvement for POS index

## Notes

- Benchmarks run in Node.js environment with mocked Chrome APIs
- Results may vary based on hardware and Node.js version
- Use consistent environment for comparing results over time
- Warmup runs help stabilize JIT-compiled code performance
