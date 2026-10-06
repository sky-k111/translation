#!/usr/bin/env node

/**
 * Node.js test runner for POSResultIndex statistics tests
 * Tests Task 6.3: Statistics and Monitoring
 */

// Mock browser APIs for Node.js environment
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

// Load the POSResultIndex class
const { POSResultIndex } = require('./pos-result-index.js');
global.POSResultIndex = POSResultIndex;

// Load the stats tests by evaluating the file
const fs = require('fs');
const path = require('path');
const testCode = fs.readFileSync(path.join(__dirname, 'pos-result-index-stats-test.js'), 'utf8');
eval(testCode);

console.log('Starting POSResultIndex Statistics & Monitoring tests...\n');

// Run the test function
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
