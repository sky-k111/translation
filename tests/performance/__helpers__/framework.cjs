/**
 * Benchmark Framework
 * Provides timing, statistical analysis, and reporting for performance benchmarks
 */

class BenchmarkFramework {
  constructor(options = {}) {
    this.options = {
      warmupRuns: options.warmupRuns || 10,
      iterations: options.iterations || 100,
      verbose: options.verbose !== false,
      ...options
    };
    
    this.results = [];
    this.currentSuite = null;
  }

  /**
   * Start a new benchmark suite
   * @param {string} name - Suite name
   */
  suite(name) {
    this.currentSuite = {
      name,
      tests: [],
      startTime: Date.now()
    };
    
    if (this.options.verbose) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`=== ${name} ===`);
      console.log(`${'='.repeat(60)}\n`);
    }
  }

  /**
   * Run a benchmark test
   * @param {string} name - Test name
   * @param {Function} fn - Function to benchmark
   * @param {Object} options - Test options
   * @returns {Object} Test results
   */
  async test(name, fn, options = {}) {
    const iterations = options.iterations || this.options.iterations;
    const warmupRuns = options.warmupRuns || this.options.warmupRuns;
    
    if (this.options.verbose) {
      console.log(`Running: ${name}`);
      console.log(`  Warmup: ${warmupRuns} runs, Benchmark: ${iterations} runs`);
    }

    // Warmup phase
    for (let i = 0; i < warmupRuns; i++) {
      await fn();
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Benchmark phase
    const times = [];
    const memoryBefore = this._getMemoryUsage();
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    }

    const memoryAfter = this._getMemoryUsage();
    const memoryDelta = memoryAfter - memoryBefore;

    // Calculate statistics
    const stats = this._calculateStats(times);
    
    const result = {
      name,
      iterations,
      ...stats,
      memoryDelta,
      memoryDeltaMB: (memoryDelta / 1024 / 1024).toFixed(2)
    };

    if (this.currentSuite) {
      this.currentSuite.tests.push(result);
    }

    if (this.options.verbose) {
      console.log(`  Mean: ${stats.mean.toFixed(4)}ms`);
      console.log(`  Median: ${stats.median.toFixed(4)}ms`);
      console.log(`  Min: ${stats.min.toFixed(4)}ms`);
      console.log(`  Max: ${stats.max.toFixed(4)}ms`);
      console.log(`  StdDev: ${stats.stdDev.toFixed(4)}ms`);
      if (memoryDelta !== 0) {
        console.log(`  Memory: ${result.memoryDeltaMB}MB`);
      }
      console.log();
    }

    return result;
  }

  /**
   * Compare two benchmark results
   * @param {string} name - Comparison name
   * @param {Object} baseline - Baseline result
   * @param {Object} optimized - Optimized result
   * @param {number} targetImprovement - Target improvement ratio
   * @returns {Object} Comparison result
   */
  compare(name, baseline, optimized, targetImprovement = 1) {
    const improvement = baseline.mean / optimized.mean;
    const passed = improvement >= targetImprovement;
    
    const comparison = {
      name,
      baseline: {
        name: baseline.name,
        mean: baseline.mean,
        median: baseline.median
      },
      optimized: {
        name: optimized.name,
        mean: optimized.mean,
        median: optimized.median
      },
      improvement: improvement.toFixed(2) + 'x',
      improvementRatio: improvement,
      targetImprovement: targetImprovement + 'x',
      passed,
      status: passed ? '✓ PASS' : '✗ FAIL'
    };

    if (this.currentSuite) {
      if (!this.currentSuite.comparisons) {
        this.currentSuite.comparisons = [];
      }
      this.currentSuite.comparisons.push(comparison);
    }

    if (this.options.verbose) {
      console.log(`Comparison: ${name}`);
      console.log(`  Baseline (${baseline.name}): ${baseline.mean.toFixed(4)}ms`);
      console.log(`  Optimized (${optimized.name}): ${optimized.mean.toFixed(4)}ms`);
      console.log(`  Improvement: ${comparison.improvement} (target: ${comparison.targetImprovement})`);
      console.log(`  ${comparison.status}`);
      console.log();
    }

    return comparison;
  }

  /**
   * End current suite and add to results
   */
  endSuite() {
    if (this.currentSuite) {
      this.currentSuite.endTime = Date.now();
      this.currentSuite.duration = this.currentSuite.endTime - this.currentSuite.startTime;
      this.results.push(this.currentSuite);
      
      if (this.options.verbose) {
        console.log(`Suite completed in ${this.currentSuite.duration}ms\n`);
      }
      
      this.currentSuite = null;
    }
  }

  /**
   * Get summary of all results
   * @returns {Object} Summary
   */
  getSummary() {
    const totalTests = this.results.reduce((sum, suite) => sum + suite.tests.length, 0);
    const totalComparisons = this.results.reduce((sum, suite) => 
      sum + (suite.comparisons ? suite.comparisons.length : 0), 0);
    const passedComparisons = this.results.reduce((sum, suite) => 
      sum + (suite.comparisons ? suite.comparisons.filter(c => c.passed).length : 0), 0);
    const failedComparisons = totalComparisons - passedComparisons;

    return {
      totalSuites: this.results.length,
      totalTests,
      totalComparisons,
      passedComparisons,
      failedComparisons,
      allPassed: failedComparisons === 0,
      suites: this.results.map(suite => ({
        name: suite.name,
        tests: suite.tests.length,
        comparisons: suite.comparisons ? suite.comparisons.length : 0,
        passed: suite.comparisons ? suite.comparisons.filter(c => c.passed).length : 0,
        duration: suite.duration
      }))
    };
  }

  /**
   * Print summary report
   */
  printSummary() {
    const summary = this.getSummary();
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('=== Benchmark Summary ===');
    console.log(`${'='.repeat(60)}\n`);
    
    console.log(`Total Suites: ${summary.totalSuites}`);
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Total Comparisons: ${summary.totalComparisons}`);
    console.log(`Passed: ${summary.passedComparisons}`);
    console.log(`Failed: ${summary.failedComparisons}`);
    console.log();

    summary.suites.forEach(suite => {
      const status = suite.passed === suite.comparisons ? '✓' : '✗';
      console.log(`${status} ${suite.name}: ${suite.passed}/${suite.comparisons} passed (${suite.duration}ms)`);
    });

    console.log();
    if (summary.allPassed) {
      console.log('✓ All benchmarks passed performance targets!');
    } else {
      console.log(`✗ ${summary.failedComparisons} benchmark(s) failed to meet targets`);
    }
    console.log();

    return summary;
  }

  /**
   * Export results to JSON
   * @param {string} filepath - Output file path
   */
  async exportJSON(filepath) {
    const fs = require('fs');
    const path = require('path');
    
    const data = {
      timestamp: new Date().toISOString(),
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch
      },
      options: this.options,
      results: this.results,
      summary: this.getSummary()
    };

    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`Results exported to: ${filepath}`);
  }

  /**
   * Calculate statistics from timing array
   * @private
   * @param {Array<number>} times - Array of timing measurements
   * @returns {Object} Statistics
   */
  _calculateStats(times) {
    const sorted = [...times].sort((a, b) => a - b);
    const sum = times.reduce((a, b) => a + b, 0);
    const mean = sum / times.length;
    
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    
    const variance = times.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      mean,
      median,
      min,
      max,
      stdDev,
      variance
    };
  }

  /**
   * Get current memory usage
   * @private
   * @returns {number} Memory usage in bytes
   */
  _getMemoryUsage() {
    if (process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }
}

module.exports = { BenchmarkFramework };
