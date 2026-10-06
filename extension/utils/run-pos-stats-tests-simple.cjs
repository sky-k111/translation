#!/usr/bin/env node

/**
 * Simple Node.js test runner for POSResultIndex statistics tests
 */

const fs = require('fs');
const path = require('path');

// Mock browser APIs
global.performance = {
  now: () => {
    const [seconds, nanoseconds] = process.hrtime();
    return seconds * 1000 + nanoseconds / 1000000;
  }
};

// Mock localStorage
const storage = new Map();
global.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear()
};

// Load POSResultIndex by evaluating the file
const indexCode = fs.readFileSync(path.join(__dirname, 'pos-result-index.js'), 'utf8');
eval(indexCode);

// Make sure POSResultIndex is available globally
if (typeof POSResultIndex === 'undefined') {
  console.error('❌ POSResultIndex not loaded properly');
  process.exit(1);
}
global.POSResultIndex = POSResultIndex;

// Load the stats test file
const testCode = fs.readFileSync(path.join(__dirname, 'pos-result-index-stats-test.js'), 'utf8');
eval(testCode);

// Run tests
if (typeof runPOSResultIndexStatsTests === 'function') {
  runPOSResultIndexStatsTests()
    .then(() => {
      console.log('\n✅ All tests passed!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Tests failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    });
} else {
  console.error('❌ Test function not found');
  process.exit(1);
}
