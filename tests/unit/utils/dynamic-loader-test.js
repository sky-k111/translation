/**
 * 动态加载器测试文件
 * 用于验证延迟加载功能的正确性
 */

// 模拟Chrome Extension API（用于测试）
if (typeof chrome === 'undefined') {
  global.chrome = {
    runtime: {
      getURL: (path) => `chrome-extension://test/${path}`
    }
  };
}

/**
 * 测试基本加载功能
 */
async function testBasicLoading() {
  console.log('=== 测试基本加载功能 ===');
  
  const loader = new DynamicLoader();
  
  // 模拟脚本路径
  const testScript = 'extension/utils/test-module.js';
  
  // 测试1: 首次加载
  console.log('\n测试1: 首次加载');
  try {
    await loader.loadScript(testScript);
    console.log('✅ 首次加载成功');
  } catch (error) {
    console.log('❌ 首次加载失败（预期，因为脚本不存在）');
  }
  
  // 测试2: 检查加载状态
  console.log('\n测试2: 检查加载状态');
  console.log('是否已加载:', loader.isLoaded(testScript));
  console.log('是否加载失败:', loader.isFailed(testScript));
  
  // 测试3: 获取统计信息
  console.log('\n测试3: 获取统计信息');
  const stats = loader.getStats();
  console.log('统计信息:', stats);
  
  console.log('\n=== 基本加载测试完成 ===');
}

/**
 * 测试批量加载
 */
async function testBatchLoading() {
  console.log('\n=== 测试批量加载 ===');
  
  const loader = new DynamicLoader();
  
  const scripts = [
    'extension/utils/module1.js',
    'extension/utils/module2.js',
    'extension/utils/module3.js'
  ];
  
  // 测试并行加载
  console.log('\n测试并行加载');
  const startTime = Date.now();
  const result = await loader.loadScripts(scripts, { parallel: true });
  const endTime = Date.now();
  
  console.log('加载结果:', result);
  console.log('加载耗时:', `${endTime - startTime}ms`);
  
  console.log('\n=== 批量加载测试完成 ===');
}

/**
 * 测试重试机制
 */
async function testRetryMechanism() {
  console.log('\n=== 测试重试机制 ===');
  
  const loader = new DynamicLoader();
  
  const testScript = 'extension/utils/failing-module.js';
  
  console.log('测试重试机制（预期失败）');
  try {
    await loader.loadScript(testScript, { retry: 2, timeout: 1000 });
    console.log('✅ 加载成功');
  } catch (error) {
    console.log('❌ 加载失败（预期）:', error.message);
  }
  
  // 检查统计
  const stats = loader.getStats();
  console.log('失败次数:', stats.totalFailed);
  
  console.log('\n=== 重试机制测试完成 ===');
}

/**
 * 测试性能
 */
async function testPerformance() {
  console.log('\n=== 测试性能 ===');
  
  const loader = new DynamicLoader();
  
  // 模拟加载100个脚本
  const scripts = Array.from({ length: 100 }, (_, i) => 
    `extension/utils/module${i}.js`
  );
  
  console.log(`测试加载${scripts.length}个脚本`);
  const startTime = Date.now();
  
  await loader.loadScripts(scripts, { parallel: true });
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  const stats = loader.getStats();
  console.log('总耗时:', `${totalTime}ms`);
  console.log('平均加载时间:', `${stats.avgLoadTime.toFixed(2)}ms`);
  console.log('成功率:', `${(stats.successRate * 100).toFixed(2)}%`);
  
  console.log('\n=== 性能测试完成 ===');
}

/**
 * 测试状态报告
 */
function testStatusReport() {
  console.log('\n=== 测试状态报告 ===');
  
  const loader = new DynamicLoader();
  
  // 模拟一些加载
  loader.loadedScripts.add('module1.js');
  loader.loadedScripts.add('module2.js');
  loader.failedScripts.add('module3.js');
  loader.stats.totalLoaded = 2;
  loader.stats.totalFailed = 1;
  loader.stats.totalLoadTime = 500;
  loader.stats.avgLoadTime = 250;
  
  const report = loader.getReport();
  console.log(report);
  
  console.log('\n=== 状态报告测试完成 ===');
}

/**
 * 测试实际场景
 */
async function testRealWorldScenario() {
  console.log('\n=== 测试实际场景 ===');
  
  const loader = new DynamicLoader();
  
  // 模拟实际的模块加载顺序
  const criticalModules = [
    'extension/utils/cache-manager.js',
    'extension/utils/event-manager.js'
  ];
  
  const importantModules = [
    'extension/services/netease-translate-service.js',
    'extension/services/ai-translate-service.js'
  ];
  
  const optionalModules = [
    'extension/utils/performance-monitor.js',
    'extension/modules/theme-manager.js'
  ];
  
  console.log('1. 加载关键模块（同步）');
  const criticalStart = Date.now();
  await loader.loadScripts(criticalModules, { parallel: false });
  console.log(`关键模块加载完成: ${Date.now() - criticalStart}ms`);
  
  console.log('\n2. 延迟500ms后加载重要模块');
  await new Promise(resolve => setTimeout(resolve, 500));
  const importantStart = Date.now();
  await loader.loadScripts(importantModules, { parallel: true });
  console.log(`重要模块加载完成: ${Date.now() - importantStart}ms`);
  
  console.log('\n3. 延迟1000ms后加载可选模块');
  await new Promise(resolve => setTimeout(resolve, 1000));
  const optionalStart = Date.now();
  await loader.loadScripts(optionalModules, { parallel: true });
  console.log(`可选模块加载完成: ${Date.now() - optionalStart}ms`);
  
  // 显示最终统计
  console.log('\n最终统计:');
  console.log(loader.getReport());
  
  console.log('\n=== 实际场景测试完成 ===');
}

// 运行所有测试
async function runAllTests() {
  try {
    await testBasicLoading();
    await testBatchLoading();
    await testRetryMechanism();
    await testPerformance();
    testStatusReport();
    await testRealWorldScenario();
    console.log('\n✅ 所有测试完成');
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 如果在Node.js环境中运行
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testBasicLoading,
    testBatchLoading,
    testRetryMechanism,
    testPerformance,
    testStatusReport,
    testRealWorldScenario,
    runAllTests
  };
}

// 如果在浏览器环境中运行
if (typeof window !== 'undefined') {
  window.dynamicLoaderTests = {
    testBasicLoading,
    testBatchLoading,
    testRetryMechanism,
    testPerformance,
    testStatusReport,
    testRealWorldScenario,
    runAllTests
  };
}
