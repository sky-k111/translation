/**
 * 缓存管理器测试文件
 * 用于验证LRU缓存策略的正确性
 */

// 模拟Chrome Storage API（用于测试）
if (typeof chrome === 'undefined') {
  global.chrome = {
    storage: {
      local: {
        get: (keys, callback) => {
          callback({});
        },
        set: (data, callback) => {
          if (callback) callback();
        },
        getBytesInUse: (keys, callback) => {
          callback(0);
        }
      }
    },
    runtime: {
      lastError: null
    }
  };
}

/**
 * 测试LRU缓存策略
 */
async function testLRUCache() {
  console.log('=== 测试LRU缓存策略 ===');
  
  // 创建一个小容量的缓存用于测试
  const cache = new AdvancedCache('test', 3, 60000, false);
  
  // 测试1: 基本的set和get
  console.log('\n测试1: 基本的set和get');
  cache.set('key1', { value: 'value1' });
  cache.set('key2', { value: 'value2' });
  cache.set('key3', { value: 'value3' });
  
  console.log('缓存大小:', cache.size()); // 应该是3
  console.log('key1存在:', cache.get('key1') !== null); // true
  
  // 测试2: LRU淘汰策略
  console.log('\n测试2: LRU淘汰策略');
  cache.set('key4', { value: 'value4' }); // 应该淘汰key1（最旧的）
  
  console.log('缓存大小:', cache.size()); // 应该是3
  console.log('key1被淘汰:', cache.get('key1') === null); // true
  console.log('key2存在:', cache.get('key2') !== null); // true
  console.log('key3存在:', cache.get('key3') !== null); // true
  console.log('key4存在:', cache.get('key4') !== null); // true
  
  // 测试3: 访问更新顺序
  console.log('\n测试3: 访问更新顺序');
  cache.get('key2'); // 访问key2，将其移到最后
  cache.set('key5', { value: 'value5' }); // 应该淘汰key3（现在最旧的）
  
  console.log('缓存大小:', cache.size()); // 应该是3
  console.log('key2存在:', cache.get('key2') !== null); // true（因为被访问过）
  console.log('key3被淘汰:', cache.get('key3') === null); // true
  console.log('key4存在:', cache.get('key4') !== null); // true
  console.log('key5存在:', cache.get('key5') !== null); // true
  
  // 测试4: 缓存统计
  console.log('\n测试4: 缓存统计');
  const stats = cache.getStats();
  console.log('命中次数:', stats.hits);
  console.log('未命中次数:', stats.misses);
  console.log('命中率:', (stats.hitRate * 100).toFixed(2) + '%');
  console.log('设置次数:', stats.sets);
  console.log('删除次数:', stats.deletes);
  console.log('清理次数:', stats.cleanups);
  
  console.log('\n=== LRU缓存测试完成 ===');
}

/**
 * 测试缓存性能
 */
async function testCachePerformance() {
  console.log('\n=== 测试缓存性能 ===');
  
  const cache = new AdvancedCache('perf-test', 1000, 60000, false);
  
  // 测试写入性能
  console.log('\n测试写入性能（1000条）');
  const writeStart = Date.now();
  for (let i = 0; i < 1000; i++) {
    cache.set(`key${i}`, { value: `value${i}`, data: 'x'.repeat(100) });
  }
  const writeEnd = Date.now();
  console.log(`写入耗时: ${writeEnd - writeStart}ms`);
  console.log(`平均写入: ${((writeEnd - writeStart) / 1000).toFixed(2)}ms/条`);
  
  // 测试读取性能（命中）
  console.log('\n测试读取性能（1000次命中）');
  const readHitStart = Date.now();
  for (let i = 0; i < 1000; i++) {
    cache.get(`key${i}`);
  }
  const readHitEnd = Date.now();
  console.log(`读取耗时: ${readHitEnd - readHitStart}ms`);
  console.log(`平均读取: ${((readHitEnd - readHitStart) / 1000).toFixed(2)}ms/条`);
  
  // 测试读取性能（未命中）
  console.log('\n测试读取性能（1000次未命中）');
  const readMissStart = Date.now();
  for (let i = 1000; i < 2000; i++) {
    cache.get(`key${i}`);
  }
  const readMissEnd = Date.now();
  console.log(`读取耗时: ${readMissEnd - readMissStart}ms`);
  console.log(`平均读取: ${((readMissEnd - readMissStart) / 1000).toFixed(2)}ms/条`);
  
  // 显示最终统计
  const stats = cache.getStats();
  console.log('\n最终统计:');
  console.log('缓存大小:', cache.size());
  console.log('命中率:', (stats.hitRate * 100).toFixed(2) + '%');
  console.log('总请求:', stats.hits + stats.misses);
  
  console.log('\n=== 缓存性能测试完成 ===');
}

/**
 * 测试缓存过期
 */
async function testCacheExpiry() {
  console.log('\n=== 测试缓存过期 ===');
  
  // 创建一个1秒过期的缓存
  const cache = new AdvancedCache('expiry-test', 100, 1000, false);
  
  cache.set('key1', { value: 'value1' });
  console.log('设置key1');
  console.log('立即读取key1:', cache.get('key1') !== null); // true
  
  // 等待1.5秒
  console.log('等待1.5秒...');
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  console.log('1.5秒后读取key1:', cache.get('key1') !== null); // false（已过期）
  
  console.log('\n=== 缓存过期测试完成 ===');
}

// 运行所有测试
async function runAllTests() {
  try {
    await testLRUCache();
    await testCachePerformance();
    await testCacheExpiry();
    console.log('\n✅ 所有测试完成');
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 如果在Node.js环境中运行
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testLRUCache, testCachePerformance, testCacheExpiry, runAllTests };
}

// 如果在浏览器环境中运行
if (typeof window !== 'undefined') {
  window.cacheTests = { testLRUCache, testCachePerformance, testCacheExpiry, runAllTests };
}
