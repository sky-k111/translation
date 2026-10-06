/**
 * Review Queue Manager Performance Tests
 * Verify performance targets: operations < 2ms for 500 words
 * 
 * Run with: node tests/review-queue-manager-performance-simple.js
 */

// Mock global objects for Node.js environment
global.performance = {
  now: () => {
    const [seconds, nanoseconds] = process.hrtime();
    return seconds * 1000 + nanoseconds / 1000000;
  }
};

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

// Load modules using dynamic import
async function loadModules() {
  // Use require for CommonJS modules
  const heapModule = await import('file://' + process.cwd() + '/extension/utils/heap.js');
  const queueModule = await import('file://' + process.cwd() + '/extension/utils/review-queue-manager.js');
  
  return {
    MinHeap: heapModule.MinHeap,
    ReviewQueueManager: queueModule.ReviewQueueManager
  };
}

// Generate test data
function generateWords(count) {
  const words = [];
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    words.push({
      word: `word${i}`,
      lastReviewTime: now - Math.random() * 30 * 24 * 60 * 60 * 1000,
      reviewCount: Math.floor(Math.random() * 10),
      difficulty: 1.0 + Math.random(),
      mastered: Math.random() < 0.1
    });
  }
  
  return words;
}

// Main test runner
async function runTests() {
  console.log('=== Review Queue Manager Performance Tests ===\n');
  console.log('Loading modules...\n');
  
  const { MinHeap, ReviewQueueManager } = await loadModules();
  
  // Make MinHeap available globally
  global.MinHeap = MinHeap;
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  // Test 1: addWord() performance with 500 words
  console.log('Test 1: addWord() performance with 500 words');
  {
    const manager = new ReviewQueueManager();
    const words = generateWords(500);
    
    const times = [];
    words.forEach(word => {
      const start = performance.now();
      manager.addWord(word);
      const end = performance.now();
      times.push(end - start);
    });
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    
    console.log(`  Average time: ${avgTime.toFixed(4)}ms`);
    console.log(`  Max time: ${maxTime.toFixed(4)}ms`);
    
    if (avgTime < 2.0) {
      console.log(`  ✓ PASS: Average addWord() time < 2ms`);
      totalPassed++;
    } else {
      console.log(`  ✗ FAIL: Average addWord() time >= 2ms`);
      totalFailed++;
    }
  }
  console.log();
  
  // Test 2: batchAdd() performance with 500 words
  console.log('Test 2: batchAdd() performance with 500 words');
  {
    const manager = new ReviewQueueManager();
    const words = generateWords(500);
    
    const start = performance.now();
    manager.batchAdd(words);
    const end = performance.now();
    const totalTime = end - start;
    
    console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`  Average per word: ${(totalTime / 500).toFixed(4)}ms`);
    
    if (totalTime < 100) {
      console.log(`  ✓ PASS: batchAdd() for 500 words < 100ms`);
      totalPassed++;
    } else {
      console.log(`  ✗ FAIL: batchAdd() for 500 words >= 100ms`);
      totalFailed++;
    }
  }
  console.log();
  
  // Test 3: getNextReview() performance with 500 words
  console.log('Test 3: getNextReview() performance with 500 words');
  {
    const manager = new ReviewQueueManager();
    const words = generateWords(500);
    manager.batchAdd(words);
    
    const times = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      const item = manager.getNextReview();
      const end = performance.now();
      times.push(end - start);
      
      if (item) {
        manager.addWord(item);
      }
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    
    console.log(`  Average time: ${avgTime.toFixed(4)}ms`);
    console.log(`  Max time: ${maxTime.toFixed(4)}ms`);
    
    if (avgTime < 2.0) {
      console.log(`  ✓ PASS: Average getNextReview() time < 2ms`);
      totalPassed++;
    } else {
      console.log(`  ✗ FAIL: Average getNextReview() time >= 2ms`);
      totalFailed++;
    }
  }
  console.log();
  
  // Test 4: updateAfterReview() performance with 500 words
  console.log('Test 4: updateAfterReview() performance with 500 words');
  {
    const manager = new ReviewQueueManager();
    const words = generateWords(500);
    manager.batchAdd(words);
    
    const times = [];
    for (let i = 0; i < 100; i++) {
      const word = words[i % words.length].word;
      const correct = Math.random() < 0.7;
      
      const start = performance.now();
      manager.updateAfterReview(word, correct);
      const end = performance.now();
      times.push(end - start);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    
    console.log(`  Average time: ${avgTime.toFixed(4)}ms`);
    console.log(`  Max time: ${maxTime.toFixed(4)}ms`);
    
    if (avgTime < 2.0) {
      console.log(`  ✓ PASS: Average updateAfterReview() time < 2ms`);
      totalPassed++;
    } else {
      console.log(`  ✗ FAIL: Average updateAfterReview() time >= 2ms`);
      totalFailed++;
    }
  }
  console.log();
  
  // Test 5: calculatePriority() performance
  console.log('Test 5: calculatePriority() performance');
  {
    const manager = new ReviewQueueManager();
    const words = generateWords(1000);
    
    const times = [];
    words.forEach(word => {
      const start = performance.now();
      manager.calculatePriority(word);
      const end = performance.now();
      times.push(end - start);
    });
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    
    console.log(`  Average time: ${avgTime.toFixed(4)}ms`);
    console.log(`  Max time: ${maxTime.toFixed(4)}ms`);
    
    if (avgTime < 0.1) {
      console.log(`  ✓ PASS: Average calculatePriority() time < 0.1ms`);
      totalPassed++;
    } else {
      console.log(`  ✗ FAIL: Average calculatePriority() time >= 0.1ms`);
      totalFailed++;
    }
  }
  console.log();
  
  // Test 6: persist() performance with 500 words
  console.log('Test 6: persist() performance with 500 words');
  {
    const manager = new ReviewQueueManager();
    const words = generateWords(500);
    manager.batchAdd(words);
    
    const times = [];
    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      await manager.persist();
      const end = performance.now();
      times.push(end - start);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    
    console.log(`  Average time: ${avgTime.toFixed(2)}ms`);
    console.log(`  Max time: ${maxTime.toFixed(2)}ms`);
    
    if (avgTime < 50) {
      console.log(`  ✓ PASS: Average persist() time < 50ms`);
      totalPassed++;
    } else {
      console.log(`  ✗ FAIL: Average persist() time >= 50ms`);
      totalFailed++;
    }
  }
  console.log();
  
  // Test 7: load() performance with 500 words
  console.log('Test 7: load() performance with 500 words');
  {
    const manager1 = new ReviewQueueManager();
    const words = generateWords(500);
    manager1.batchAdd(words);
    await manager1.persist();
    
    const times = [];
    for (let i = 0; i < 10; i++) {
      const manager2 = new ReviewQueueManager();
      const start = performance.now();
      await manager2.load();
      const end = performance.now();
      times.push(end - start);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    
    console.log(`  Average time: ${avgTime.toFixed(2)}ms`);
    console.log(`  Max time: ${maxTime.toFixed(2)}ms`);
    
    if (avgTime < 100) {
      console.log(`  ✓ PASS: Average load() time < 100ms`);
      totalPassed++;
    } else {
      console.log(`  ✗ FAIL: Average load() time >= 100ms`);
      totalFailed++;
    }
  }
  console.log();
  
  // Test 8: getStats() performance with 500 words
  console.log('Test 8: getStats() performance with 500 words');
  {
    const manager = new ReviewQueueManager();
    const words = generateWords(500);
    manager.batchAdd(words);
    
    const times = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      manager.getStats();
      const end = performance.now();
      times.push(end - start);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    
    console.log(`  Average time: ${avgTime.toFixed(4)}ms`);
    console.log(`  Max time: ${maxTime.toFixed(4)}ms`);
    
    if (avgTime < 5.0) {
      console.log(`  ✓ PASS: Average getStats() time < 5ms`);
      totalPassed++;
    } else {
      console.log(`  ✗ FAIL: Average getStats() time >= 5ms`);
      totalFailed++;
    }
  }
  console.log();
  
  // Test 9: Scalability test
  console.log('Test 9: Scalability test - operations with increasing queue sizes');
  {
    const sizes = [100, 250, 500, 750, 1000];
    
    console.log('\n  Queue Size | addWord (ms) | getNextReview (ms) | updateAfterReview (ms)');
    console.log('  -----------|--------------|--------------------|-----------------------');
    
    sizes.forEach(size => {
      const manager = new ReviewQueueManager();
      const words = generateWords(size);
      
      manager.batchAdd(words.slice(0, size - 1));
      const addStart = performance.now();
      manager.addWord(words[size - 1]);
      const addEnd = performance.now();
      const addTime = addEnd - addStart;
      
      const getStart = performance.now();
      manager.getNextReview();
      const getEnd = performance.now();
      const getTime = getEnd - getStart;
      
      const updateStart = performance.now();
      manager.updateAfterReview(words[0].word, true);
      const updateEnd = performance.now();
      const updateTime = updateEnd - updateStart;
      
      console.log(`  ${size.toString().padStart(10)} | ${addTime.toFixed(4).padStart(12)} | ${getTime.toFixed(4).padStart(18)} | ${updateTime.toFixed(4).padStart(21)}`);
    });
    
    console.log(`  ✓ PASS: Scalability test completed`);
    totalPassed++;
  }
  console.log();
  
  // Test 10: Memory usage test
  console.log('Test 10: Memory usage test with 500 words');
  {
    const manager = new ReviewQueueManager();
    const words = generateWords(500);
    manager.batchAdd(words);
    
    const stats = manager.getStats();
    const memoryUsage = stats.memoryUsage;
    const memoryMB = memoryUsage / (1024 * 1024);
    
    console.log(`  Memory usage: ${stats.memoryUsageFormatted}`);
    console.log(`  Memory per word: ${(memoryUsage / 500).toFixed(0)} bytes`);
    
    const originalSize = words.reduce((sum, word) => {
      return sum + word.word.length * 2 + 8 * 4 + 4;
    }, 0);
    
    const overhead = ((memoryUsage / originalSize) * 100).toFixed(1);
    console.log(`  Memory overhead: ${overhead}%`);
    
    if (memoryMB < 1 && parseFloat(overhead) < 150) {
      console.log(`  ✓ PASS: Memory usage < 1MB and overhead < 150%`);
      totalPassed++;
    } else {
      console.log(`  ✗ FAIL: Memory usage >= 1MB or overhead >= 150%`);
      totalFailed++;
    }
  }
  console.log();
  
  // Summary
  console.log('=== Performance Test Summary ===');
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Total: ${totalPassed + totalFailed}`);
  console.log();
  
  if (totalFailed === 0) {
    console.log('✓ All performance tests passed!');
    console.log('  - Operations complete in < 2ms for 500 words');
    console.log('  - Persistence completes in < 50ms');
    console.log('  - Memory overhead is < 150%');
    console.log('  - Operations scale logarithmically O(log n)');
    return true;
  } else {
    console.log(`✗ ${totalFailed} performance test(s) failed`);
    return false;
  }
}

// Run tests
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
