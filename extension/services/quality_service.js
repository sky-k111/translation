/**
 * 翻译质量评估模块
 * 负责收集和记录翻译请求的性能指标
 * 
 * 优化点：
 * 1. 为每个API设置独立超时
 * 2. 并行尝试多个服务
 * 3. 缓存失败结果
 * 4. 请求去重
 */

// API超时配置（毫秒）
const API_TIMEOUTS = {
  ai: 5000,        // AI翻译：5秒
  youdao: 3000,    // 有道翻译：3秒
  myMemory: 2000,  // MyMemory：2秒
  baidu: 2000      // 百度翻译：2秒
};

const QUALITY_METRICS = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  aiUsed: 0,
  fallbackUsed: 0,
  avgLatency: 0,
  latencyHistory: [],
  // 新增：各服务的统计
  serviceStats: {
    ai: { success: 0, failed: 0, avgLatency: 0 },
    youdao: { success: 0, failed: 0, avgLatency: 0 },
    myMemory: { success: 0, failed: 0, avgLatency: 0 },
    baidu: { success: 0, failed: 0, avgLatency: 0 }
  }
};

// 失败缓存：避免重复请求已知失败的内容
const failureCache = new Map();
const FAILURE_CACHE_TTL = 3600000; // 1小时

// 请求去重：避免并发的重复请求
const pendingRequests = new Map();

// 保存统计信息到本地存储
async function saveMetrics() {
  await chrome.storage.local.set({ qualityMetrics: QUALITY_METRICS });
}

// 加载统计信息
async function loadMetrics() {
  const result = await chrome.storage.local.get(['qualityMetrics']);
  if (result.qualityMetrics) {
    Object.assign(QUALITY_METRICS, result.qualityMetrics);
  }
}

// 记录一次翻译请求
function recordTranslation(source, success, latency) {
  QUALITY_METRICS.totalRequests++;
  if (success) {
    QUALITY_METRICS.successfulRequests++;
  } else {
    QUALITY_METRICS.failedRequests++;
  }

  if (source === 'ai') {
    QUALITY_METRICS.aiUsed++;
  } else if (source === 'youdao') {
    QUALITY_METRICS.fallbackUsed++;
  }

  // 更新平均延迟 (简单移动平均)
  const n = QUALITY_METRICS.successfulRequests;
  if (n > 0) {
    QUALITY_METRICS.avgLatency = ((QUALITY_METRICS.avgLatency * (n - 1)) + latency) / n;
  }
  
  // 保留最近 100 次延迟记录
  if (latency > 0) {
    QUALITY_METRICS.latencyHistory.push(latency);
    if (QUALITY_METRICS.latencyHistory.length > 100) {
      QUALITY_METRICS.latencyHistory.shift();
    }
  }
  
  // 更新服务统计
  if (QUALITY_METRICS.serviceStats[source]) {
    const stats = QUALITY_METRICS.serviceStats[source];
    if (success) {
      stats.success++;
      const count = stats.success;
      stats.avgLatency = ((stats.avgLatency * (count - 1)) + latency) / count;
    } else {
      stats.failed++;
    }
  }

  saveMetrics();
}

/**
 * 带超时控制的翻译请求
 * @param {Function} translateFn - 翻译函数
 * @param {string} text - 待翻译文本
 * @param {string} context - 上下文
 * @param {number} timeout - 超时时间（毫秒）
 * @param {string} serviceName - 服务名称
 * @returns {Promise<Object>} 翻译结果
 */
async function translateWithTimeout(translateFn, text, context, timeout, serviceName) {
  const startTime = Date.now();
  
  try {
    const result = await Promise.race([
      translateFn(text, context),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`${serviceName} timeout`)), timeout)
      )
    ]);
    
    const latency = Date.now() - startTime;
    recordTranslation(serviceName, true, latency);
    
    return {
      ...result,
      source: serviceName,
      latency
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    recordTranslation(serviceName, false, latency);
    throw error;
  }
}

/**
 * 并行尝试多个翻译服务
 * @param {string} text - 待翻译文本
 * @param {string} context - 上下文
 * @param {Array} services - 服务配置数组
 * @returns {Promise<Object>} 第一个成功的翻译结果
 */
async function translateWithParallelFallback(text, context, services) {
  // 检查失败缓存
  const cacheKey = `failure_${text}`;
  const cached = failureCache.get(cacheKey);
  if (cached && Date.now() - cached.time < FAILURE_CACHE_TTL) {
    throw new Error('Translation failed recently, using cached failure');
  }
  
  // 检查请求去重
  const requestKey = `${text}_${context || ''}`;
  if (pendingRequests.has(requestKey)) {
    console.log('Reusing pending request for:', text);
    return pendingRequests.get(requestKey);
  }
  
  // 创建并行请求Promise
  const requestPromise = (async () => {
    try {
      // 并行执行所有服务
      const promises = services.map(service =>
        translateWithTimeout(
          service.fn,
          text,
          context,
          service.timeout,
          service.name
        ).catch(err => ({ error: err, service: service.name }))
      );
      
      // 等待所有请求完成
      const results = await Promise.all(promises);
      
      // 返回第一个成功的结果
      for (const result of results) {
        if (!result.error) {
          // 清除失败缓存
          failureCache.delete(cacheKey);
          return result;
        }
      }
      
      // 所有服务都失败，缓存失败结果
      failureCache.set(cacheKey, { time: Date.now() });
      
      // 清理失败缓存（保持最多1000条）
      if (failureCache.size > 1000) {
        const firstKey = failureCache.keys().next().value;
        failureCache.delete(firstKey);
      }
      
      throw new Error('All translation services failed');
    } finally {
      // 清除请求去重缓存
      pendingRequests.delete(requestKey);
    }
  })();
  
  // 保存到请求去重缓存
  pendingRequests.set(requestKey, requestPromise);
  
  return requestPromise;
}

/**
 * 清除失败缓存
 */
function clearFailureCache() {
  failureCache.clear();
  console.log('Failure cache cleared');
}

/**
 * 获取失败缓存统计
 */
function getFailureCacheStats() {
  return {
    size: failureCache.size,
    entries: Array.from(failureCache.entries()).map(([key, value]) => ({
      key,
      age: Date.now() - value.time
    }))
  };
}

// 获取质量报告
function getQualityReport() {
  return {
    ...QUALITY_METRICS,
    successRate: QUALITY_METRICS.totalRequests ? (QUALITY_METRICS.successfulRequests / QUALITY_METRICS.totalRequests * 100).toFixed(2) + '%' : '0%',
    aiUtilization: QUALITY_METRICS.totalRequests ? (QUALITY_METRICS.aiUsed / QUALITY_METRICS.totalRequests * 100).toFixed(2) + '%' : '0%',
    failureCacheSize: failureCache.size,
    pendingRequestsCount: pendingRequests.size
  };
}

// 初始化加载
loadMetrics().catch(console.error);
