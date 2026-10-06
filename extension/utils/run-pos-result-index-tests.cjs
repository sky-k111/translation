/**
 * Node.js test runner for POSResultIndex
 * Simulates browser environment with localStorage
 */

// Simulate browser globals
global.performance = require('perf_hooks').performance;
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

// Load the POSResultIndex class
const fs = require('fs');
const path = require('path');

// Create a custom module context for the index file
const indexCode = fs.readFileSync(path.join(__dirname, 'pos-result-index.js'), 'utf8');
const moduleWrapper = `(function(exports, module) { ${indexCode} })`;
const wrappedModule = { exports: {} };
eval(moduleWrapper)(wrappedModule.exports, wrappedModule);
const { POSResultIndex } = wrappedModule.exports;
global.POSResultIndex = POSResultIndex;

// Load the test suite
const testCode = fs.readFileSync(path.join(__dirname, 'pos-result-index-test.js'), 'utf8');
eval(testCode);

// Run tests
(async () => {
  try {
    console.log('Starting POSResultIndex tests...\n');
    await runPOSResultIndexTests();
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Tests failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
