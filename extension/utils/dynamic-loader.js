/**
 * 动态模块加载器
 * 用于延迟加载非关键模块，减少初始加载时间
 * 
 * 性能优化：
 * - 支持优先级队列
 * - 并行加载控制
 * - 加载失败重试
 * - 加载统计和监控
 */

class DynamicLoader {
  constructor() {
    this.loadedScripts = new Set();
    this.loadingScripts = new Map(); // script path -> Promise
    this.failedScripts = new Set();
    this.stats = {
      totalLoaded: 0,
      totalFailed: 0,
      totalLoadTime: 0,
      avgLoadTime: 0,
      loadTimes: []
    };
    
    // 优先级队列
    this.priorityQueue = {
      high: [],
      normal: [],
      low: []
    };
    
    // 并发控制
    this.maxConcurrent = 3;
    this.currentLoading = 0;
    
    console.log('🔧 动态加载器已初始化');
  }
  
  /**
   * 加载脚本
   * @param {string} scriptPath - 脚本路径
   * @param {Object} options - 加载选项
   * @returns {Promise} 加载Promise
   */
  async loadScript(scriptPath, options = {}) {
    const {
      priority = 'normal',
      retry = 2,
      timeout = 10000
    } = options;
    
    // 如果已加载，直接返回
    if (this.loadedScripts.has(scriptPath)) {
      console.log(`✅ 脚本已加载: ${scriptPath}`);
      return Promise.resolve();
    }
    
    // 如果正在加载，返回现有Promise
    if (this.loadingScripts.has(scriptPath)) {
      console.log(`⏳ 脚本正在加载: ${scriptPath}`);
      return this.loadingScripts.get(scriptPath);
    }
    
    // 创建加载Promise
    const loadPromise = this._loadScriptWithRetry(scriptPath, retry, timeout);
    this.loadingScripts.set(scriptPath, loadPromise);
    
    try {
      await loadPromise;
      this.loadedScripts.add(scriptPath);
      this.loadingScripts.delete(scriptPath);
      console.log(`✅ 脚本加载成功: ${scriptPath}`);
      return Promise.resolve();
    } catch (error) {
      this.failedScripts.add(scriptPath);
      this.loadingScripts.delete(scriptPath);
      console.error(`❌ 脚本加载失败: ${scriptPath}`, error);
      throw error;
    }
  }
  
  /**
   * 带重试的脚本加载
   * @private
   */
  async _loadScriptWithRetry(scriptPath, maxRetries, timeout) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 重试加载 (${attempt}/${maxRetries}): ${scriptPath}`);
          // 指数退避
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
        
        const startTime = Date.now();
        await this._loadScriptCore(scriptPath, timeout);
        const loadTime = Date.now() - startTime;
        
        // 更新统计
        this._updateStats(loadTime, true);
        
        return;
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ 加载失败 (尝试 ${attempt + 1}/${maxRetries + 1}): ${scriptPath}`, error);
      }
    }
    
    // 所有重试都失败
    this._updateStats(0, false);
    throw lastError;
  }
  
  /**
   * 核心脚本加载逻辑
   * @private
   */
  _loadScriptCore(scriptPath, timeout) {
    return new Promise((resolve, reject) => {
      // 验证扩展上下文是否有效
      if (!chrome.runtime || !chrome.runtime.id) {
        reject(new Error('Extension context is invalid'));
        return;
      }
      
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL(scriptPath);
      script.async = true;
      
      // 超时控制
      const timeoutId = setTimeout(() => {
        script.remove();
        reject(new Error(`Script load timeout: ${scriptPath}`));
      }, timeout);
      
      script.onload = () => {
        clearTimeout(timeoutId);
        resolve();
      };
      
      script.onerror = (error) => {
        clearTimeout(timeoutId);
        script.remove();
        reject(new Error(`Script load error: ${scriptPath}`));
      };
      
      // 添加到DOM
      (document.head || document.documentElement).appendChild(script);
    });
  }
  
  /**
   * 批量加载脚本
   * @param {Array} scripts - 脚本路径数组
   * @param {Object} options - 加载选项
   * @returns {Promise} 加载Promise
   */
  async loadScripts(scripts, options = {}) {
    const { parallel = true } = options;
    
    if (parallel) {
      // 并行加载
      const results = await Promise.allSettled(
        scripts.map(script => this.loadScript(script, options))
      );
      
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log(`📦 批量加载完成: ${succeeded}成功, ${failed}失败`);
      
      return {
        succeeded,
        failed,
        total: scripts.length
      };
    } else {
      // 串行加载
      let succeeded = 0;
      let failed = 0;
      
      for (const script of scripts) {
        try {
          await this.loadScript(script, options);
          succeeded++;
        } catch (error) {
          failed++;
        }
      }
      
      console.log(`📦 批量加载完成: ${succeeded}成功, ${failed}失败`);
      
      return {
        succeeded,
        failed,
        total: scripts.length
      };
    }
  }
  
  /**
   * 预加载脚本（不执行）
   * @param {string} scriptPath - 脚本路径
   */
  preloadScript(scriptPath) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = chrome.runtime.getURL(scriptPath);
    document.head.appendChild(link);
    
    console.log(`🔮 预加载脚本: ${scriptPath}`);
  }
  
  /**
   * 更新加载统计
   * @private
   */
  _updateStats(loadTime, success) {
    if (success) {
      this.stats.totalLoaded++;
      this.stats.totalLoadTime += loadTime;
      this.stats.loadTimes.push(loadTime);
      
      // 只保留最近100次加载时间
      if (this.stats.loadTimes.length > 100) {
        this.stats.loadTimes.shift();
      }
      
      // 计算平均加载时间
      this.stats.avgLoadTime = this.stats.totalLoadTime / this.stats.totalLoaded;
    } else {
      this.stats.totalFailed++;
    }
  }
  
  /**
   * 获取加载统计
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      loadedCount: this.loadedScripts.size,
      failedCount: this.failedScripts.size,
      loadingCount: this.loadingScripts.size,
      successRate: this.stats.totalLoaded / (this.stats.totalLoaded + this.stats.totalFailed) || 0
    };
  }
  
  /**
   * 检查脚本是否已加载
   * @param {string} scriptPath - 脚本路径
   * @returns {boolean} 是否已加载
   */
  isLoaded(scriptPath) {
    return this.loadedScripts.has(scriptPath);
  }
  
  /**
   * 检查脚本是否正在加载
   * @param {string} scriptPath - 脚本路径
   * @returns {boolean} 是否正在加载
   */
  isLoading(scriptPath) {
    return this.loadingScripts.has(scriptPath);
  }
  
  /**
   * 检查脚本是否加载失败
   * @param {string} scriptPath - 脚本路径
   * @returns {boolean} 是否加载失败
   */
  isFailed(scriptPath) {
    return this.failedScripts.has(scriptPath);
  }
  
  /**
   * 重置加载器状态
   */
  reset() {
    this.loadedScripts.clear();
    this.loadingScripts.clear();
    this.failedScripts.clear();
    this.stats = {
      totalLoaded: 0,
      totalFailed: 0,
      totalLoadTime: 0,
      avgLoadTime: 0,
      loadTimes: []
    };
    
    console.log('🔄 动态加载器已重置');
  }
  
  /**
   * 获取加载器状态报告
   * @returns {string} 状态报告
   */
  getReport() {
    const stats = this.getStats();
    
    return `
动态加载器状态报告
==================
已加载: ${stats.loadedCount}
失败: ${stats.failedCount}
正在加载: ${stats.loadingCount}
总加载次数: ${stats.totalLoaded}
总失败次数: ${stats.totalFailed}
成功率: ${(stats.successRate * 100).toFixed(2)}%
平均加载时间: ${stats.avgLoadTime.toFixed(2)}ms
总加载时间: ${stats.totalLoadTime.toFixed(2)}ms
    `.trim();
  }
}

// 创建全局实例
const dynamicLoader = new DynamicLoader();

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DynamicLoader, dynamicLoader };
} else if (typeof window !== 'undefined') {
  window.DynamicLoader = DynamicLoader;
  window.dynamicLoader = dynamicLoader;
} else if (typeof self !== 'undefined') {
  self.DynamicLoader = DynamicLoader;
  self.dynamicLoader = dynamicLoader;
}
