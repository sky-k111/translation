/**
 * StyleManager 测试文件
 * 用于验证样式管理器的功能
 */

console.log('=== StyleManager 测试开始 ===\n');

// 测试1: 初始化
console.log('测试1: StyleManager初始化');
if (window.styleManager) {
  console.log('✅ StyleManager已初始化');
  console.log('   可用样式:', Object.keys(window.styleManager.styleMap));
} else {
  console.error('❌ StyleManager未初始化');
}

// 测试2: 加载单个样式
console.log('\n测试2: 加载单个样式');
async function testLoadSingleStyle() {
  try {
    await window.styleManager.loadStyle('variables');
    console.log('✅ variables.css加载成功');
    
    if (window.styleManager.isLoaded('variables')) {
      console.log('✅ 样式状态正确');
    } else {
      console.error('❌ 样式状态错误');
    }
  } catch (error) {
    console.error('❌ 加载失败:', error.message);
  }
}

// 测试3: 批量加载样式
console.log('\n测试3: 批量加载样式');
async function testLoadMultipleStyles() {
  try {
    const results = await window.styleManager.loadStyles(['reset', 'utils']);
    console.log('✅ 批量加载完成');
    console.log('   结果:', results.map(r => r.status).join(', '));
  } catch (error) {
    console.error('❌ 批量加载失败:', error.message);
  }
}

// 测试4: 重复加载检测
console.log('\n测试4: 重复加载检测');
async function testDuplicateLoad() {
  try {
    const start = performance.now();
    await window.styleManager.loadStyle('variables');
    const time = performance.now() - start;
    
    if (time < 10) {
      console.log('✅ 重复加载被正确跳过 (耗时: ' + time.toFixed(2) + 'ms)');
    } else {
      console.warn('⚠️ 重复加载可能未被优化 (耗时: ' + time.toFixed(2) + 'ms)');
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 测试5: 根据组件需求加载
console.log('\n测试5: 根据组件需求加载');
async function testLoadRequiredStyles() {
  const mockComponents = [
    { name: 'Button', requiresVariables: true },
    { name: 'Card', requiresAnimations: true, requiresUtils: true }
  ];
  
  try {
    await window.styleManager.loadRequiredStyles(mockComponents);
    console.log('✅ 根据组件需求加载成功');
  } catch (error) {
    console.error('❌ 加载失败:', error.message);
  }
}

// 测试6: 获取统计信息
console.log('\n测试6: 获取统计信息');
function testGetStats() {
  const stats = window.styleManager.getStats();
  console.log('✅ 统计信息:');
  console.log('   已加载:', stats.totalLoaded);
  console.log('   失败:', stats.totalFailed);
  console.log('   平均加载时间:', stats.avgLoadTime);
  console.log('   已加载样式:', stats.loadedStyles.join(', '));
}

// 测试7: 卸载样式
console.log('\n测试7: 卸载样式');
function testUnloadStyle() {
  try {
    window.styleManager.unloadStyle('utils');
    
    if (!window.styleManager.isLoaded('utils')) {
      console.log('✅ 样式卸载成功');
    } else {
      console.error('❌ 样式卸载失败');
    }
  } catch (error) {
    console.error('❌ 卸载失败:', error.message);
  }
}

// 运行所有测试
async function runAllTests() {
  await testLoadSingleStyle();
  await testLoadMultipleStyles();
  await testDuplicateLoad();
  await testLoadRequiredStyles();
  testGetStats();
  testUnloadStyle();
  
  console.log('\n=== StyleManager 测试完成 ===');
  console.log('\n最终统计:');
  console.log(window.styleManager.getStats());
}

// 延迟执行测试，确保DOM已加载
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runAllTests);
} else {
  setTimeout(runAllTests, 100);
}
