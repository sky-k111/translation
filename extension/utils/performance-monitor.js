/**
 * 单词翻译助手 - 性能监控模块
 * 用于测量关键函数的执行时间和各种性能指标
 */

/**
 * 性能监控工具
 * 用于测量关键函数的执行时间
 */
class PerformanceMonitor {
  constructor() {
    this.performanceEntries = [];
    this.maxEntries = 200; // 限制存储的性能条目数量
    this.stats = {
      // 函数执行时间统计
      functionStats: new Map(),
      // 翻译性能统计
      translationStats: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgResponseTime: 0,
        totalResponseTime: 0,
        firstTranslationTime: 0,
        cacheHitRate: 0
      },
      // 高亮性能统计
      highlightStats: {
        totalHighlightOperations: 0,
        avgHighlightTime: 0,
        totalHighlightTime: 0,
        maxHighlightTime: 0
      },
      // DOM 性能统计
      domStats: {
        totalWalks: 0,
        avgWalkTime: 0,
        totalWalkTime: 0,
        maxWalkTime: 0
      },
      // 事件性能统计
      eventStats: {
        totalEvents: 0,
        handledEvents: 0,
        avgEventProcessingTime: 0,
        totalEventProcessingTime: 0
      },
      // 用户体验指标
      uxStats: {
        firstTranslationTime: 0,
        avgTranslationResponseTime: 0,
        pageLoadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        fps: 0,
        memory: 0,
        cpuUsage: 0
      },
      // 缓存性能统计
      cacheStats: {
        totalRequests: 0,
        hits: 0,
        misses: 0,
        hitRate: 0
      }
    };
    
    // 初始化用户体验指标监控
    this._initUXMetrics();
  }
  
  /**
   * 初始化用户体验指标监控
   * @private
   */
  _initUXMetrics() {
    // 测量页面加载时间
    if (performance.timing.loadEventEnd > 0) {
      this.stats.uxStats.pageLoadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    }
    
    // 监控内存使用情况
    if (navigator && navigator.deviceMemory) {
      this.stats.uxStats.memory = navigator.deviceMemory;
    }
    
    // 监控 FPS
    this._monitorFPS();
  }
  
  /**
   * 监控 FPS
   * @private
   */
  _monitorFPS() {
    let frames = 0;
    let lastTime = performance.now();
    
    const calculateFPS = () => {
      frames++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) { // 每秒计算一次
        this.stats.uxStats.fps = Math.round((frames * 1000) / (currentTime - lastTime));
        frames = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(calculateFPS);
    };
    
    requestAnimationFrame(calculateFPS);
  }
  
  /**
   * 初始化性能监控器（用于模块管理器统一调用）
   */
  async init() {
    // 性能监控器已经在构造函数中初始化，这里只需要返回一个成功的Promise
    return Promise.resolve('性能监控器初始化完成');
  }
  
  /**
   * 开始测量函数执行时间
   * @param {string} name - 测量名称
   * @returns {string} 测量ID
   */
  start(name) {
    const id = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    performance.mark(`${id}-start`);
    return id;
  }
  
  /**
   * 结束测量并记录结果
   * @param {string} id - 测量ID
   * @param {string} name - 测量名称
   * @param {Object} metadata - 元数据（可选）
   */
  end(id, name, metadata = {}) {
    performance.mark(`${id}-end`);
    performance.measure(name, `${id}-start`, `${id}-end`);
    
    // 获取测量结果
    const entries = performance.getEntriesByName(name);
    if (entries.length > 0) {
      const entry = entries[entries.length - 1];
      const duration = entry.duration;
      
      const performanceData = {
        name,
        duration: duration,
        startTime: entry.startTime,
        metadata,
        timestamp: Date.now()
      };
      
      // 保存到内存中
      this.performanceEntries.push(performanceData);
      
      // 限制存储数量
      if (this.performanceEntries.length > this.maxEntries) {
        this.performanceEntries.shift();
      }
      
      // 更新统计信息
      this._updateStats(name, duration, metadata);
      
      // 记录到控制台（可选，仅在开发模式下）
      if (metadata.verbose) {
        console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`, metadata);
      }
      
      // 清理性能标记和测量
      performance.clearMarks(`${id}-start`);
      performance.clearMarks(`${id}-end`);
      performance.clearMeasures(name);
    }
  }
  
  /**
   * 更新统计信息
   * @param {string} name - 测量名称
   * @param {number} duration - 执行时间
   * @param {Object} metadata - 元数据
   * @private
   */
  _updateStats(name, duration, metadata) {
    // 更新函数执行时间统计
    if (!this.stats.functionStats.has(name)) {
      this.stats.functionStats.set(name, {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0
      });
    }
    
    const funcStats = this.stats.functionStats.get(name);
    funcStats.count++;
    funcStats.totalDuration += duration;
    funcStats.avgDuration = funcStats.totalDuration / funcStats.count;
    funcStats.minDuration = Math.min(funcStats.minDuration, duration);
    funcStats.maxDuration = Math.max(funcStats.maxDuration, duration);
    
    // 更新翻译性能统计
    if (name === 'translateText') {
      this.stats.translationStats.totalRequests++;
      this.stats.translationStats.totalResponseTime += duration;
      this.stats.translationStats.avgResponseTime = this.stats.translationStats.totalResponseTime / this.stats.translationStats.totalRequests;
      
      if (metadata.fromCache) {
        this.stats.cacheStats.hits++;
      } else {
        this.stats.cacheStats.misses++;
      }
      
      if (metadata.success) {
        this.stats.translationStats.successfulRequests++;
      } else {
        this.stats.translationStats.failedRequests++;
      }
      
      // 记录首次翻译时间
      if (this.stats.uxStats.firstTranslationTime === 0) {
        this.stats.uxStats.firstTranslationTime = duration;
        this.stats.translationStats.firstTranslationTime = duration;
      }
    }
    
    // 更新高亮性能统计
    if (name === 'highlightTranslatedWords') {
      this.stats.highlightStats.totalHighlightOperations++;
      this.stats.highlightStats.totalHighlightTime += duration;
      this.stats.highlightStats.avgHighlightTime = this.stats.highlightStats.totalHighlightTime / this.stats.highlightStats.totalHighlightOperations;
      this.stats.highlightStats.maxHighlightTime = Math.max(this.stats.highlightStats.maxHighlightTime, duration);
    }
    
    // 更新 DOM 性能统计
    if (name === 'walkTextNodes') {
      this.stats.domStats.totalWalks++;
      this.stats.domStats.totalWalkTime += duration;
      this.stats.domStats.avgWalkTime = this.stats.domStats.totalWalkTime / this.stats.domStats.totalWalks;
      this.stats.domStats.maxWalkTime = Math.max(this.stats.domStats.maxWalkTime, duration);
    }
    
    // 更新缓存统计
    this.stats.cacheStats.totalRequests = this.stats.cacheStats.hits + this.stats.cacheStats.misses;
    this.stats.cacheStats.hitRate = this.stats.cacheStats.totalRequests > 0 ? this.stats.cacheStats.hits / this.stats.cacheStats.totalRequests : 0;
    this.stats.translationStats.cacheHitRate = this.stats.cacheStats.hitRate;
  }
  
  /**
   * 获取性能数据
   * @returns {Array} 性能数据数组
   */
  getPerformanceData() {
    return [...this.performanceEntries];
  }
  
  /**
   * 获取性能统计信息
   * @returns {Object} 性能统计信息
   */
  getStats() {
    return {
      ...this.stats,
      timestamp: Date.now(),
      entryCount: this.performanceEntries.length,
      maxEntries: this.maxEntries
    };
  }
  
  /**
   * 更新事件统计信息
   * @param {number} processingTime - 事件处理时间
   */
  updateEventStats(processingTime) {
    this.stats.eventStats.totalEvents++;
    this.stats.eventStats.handledEvents++;
    this.stats.eventStats.totalEventProcessingTime += processingTime;
    this.stats.eventStats.avgEventProcessingTime = this.stats.eventStats.totalEventProcessingTime / this.stats.eventStats.handledEvents;
  }
  
  /**
   * 更新缓存统计信息
   * @param {boolean} hit - 是否命中缓存
   */
  updateCacheStats(hit) {
    if (hit) {
      this.stats.cacheStats.hits++;
    } else {
      this.stats.cacheStats.misses++;
    }
    
    this.stats.cacheStats.totalRequests = this.stats.cacheStats.hits + this.stats.cacheStats.misses;
    this.stats.cacheStats.hitRate = this.stats.cacheStats.totalRequests > 0 ? this.stats.cacheStats.hits / this.stats.cacheStats.totalRequests : 0;
  }
  
  /**
   * 清理所有性能数据
   */
  clear() {
    this.performanceEntries = [];
  }
  
  /**
   * 上报性能数据
   * 将性能统计信息输出到控制台或发送到服务器
   */
  reportPerformance() {
    const stats = this.getStats();
    
    // 输出到控制台
    console.log('[Performance Report]', {
      timestamp: new Date(stats.timestamp).toISOString(),
      translation: {
        total: stats.translationStats.totalRequests,
        success: stats.translationStats.successfulRequests,
        failed: stats.translationStats.failedRequests,
        avgTime: `${stats.translationStats.avgResponseTime.toFixed(2)}ms`,
        cacheHitRate: `${(stats.cacheStats.hitRate * 100).toFixed(1)}%`
      },
      highlight: {
        operations: stats.highlightStats.totalHighlightOperations,
        avgTime: `${stats.highlightStats.avgHighlightTime.toFixed(2)}ms`,
        maxTime: `${stats.highlightStats.maxHighlightTime.toFixed(2)}ms`
      },
      ux: {
        fps: stats.uxStats.fps,
        firstTranslation: `${stats.uxStats.firstTranslationTime.toFixed(2)}ms`
      }
    });
    
    // 可选：发送到服务器进行分析
    // this._sendToServer(stats);
  }
}

// 导出常量和类，供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  // CommonJS 模块系统
  module.exports = { PerformanceMonitor };
} else if (typeof window !== 'undefined') {
  // 浏览器环境
  window.PerformanceMonitor = PerformanceMonitor;
} else if (typeof self !== 'undefined') {
  // Service Worker 环境
  self.PerformanceMonitor = PerformanceMonitor;
}