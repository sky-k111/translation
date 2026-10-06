/**
 * 单词翻译助手 - 服务降级管理模块
 * 用于监控系统状态并自动调整功能，确保插件在高负载或服务不可用时能够正常运行
 */

/**
 * 服务降级管理器
 * 用于监控系统状态并自动调整功能，确保插件在高负载或服务不可用时能够正常运行
 */
class ServiceDegradationManager {
  constructor() {
    this.degradationLevels = {
      NORMAL: 0,      // 正常状态
      LIGHT: 1,       // 轻度降级：关闭一些非核心功能
      MODERATE: 2,    // 中度降级：限制核心功能的频率或质量
      SEVERE: 3       // 重度降级：只保留最核心的功能
    };
    
    this.currentLevel = this.degradationLevels.NORMAL;
    this.errorCount = 0;
    this.performanceThresholds = {
      translateText: 1000,  // 翻译函数执行时间阈值（毫秒）
      highlightTranslatedWords: 500, // 高亮函数执行时间阈值（毫秒）
      renderPopup: 200      // 弹窗渲染时间阈值（毫秒）
    };
    
    // 错误计数重置定时器
    this.errorResetTimer = setInterval(() => {
      this.errorCount = 0;
      this.evaluateDegradationLevel();
    }, 60000); // 每分钟重置一次错误计数
    
    // 定期评估降级级别
    this.evaluationTimer = setInterval(() => {
      this.evaluateDegradationLevel();
    }, 30000); // 每30秒评估一次
  }
  
  /**
   * 初始化服务降级管理器（用于模块管理器统一调用）
   */
  async init() {
    // 服务降级管理器已经在构造函数中初始化，这里只需要返回一个成功的Promise
    return Promise.resolve('服务降级管理器初始化完成');
  }
  
  /**
   * 记录错误
   * @param {string} service - 服务名称
   * @param {Error} error - 错误对象
   */
  recordError(service, error) {
    this.errorCount++;
    console.warn(`服务错误 - ${service}:`, error.message);
    this.evaluateDegradationLevel();
  }
  
  /**
   * 评估降级级别
   */
  evaluateDegradationLevel() {
    let newLevel = this.degradationLevels.NORMAL;
    
    // 基于错误计数
    if (this.errorCount >= 10) {
      newLevel = this.degradationLevels.SEVERE;
    } else if (this.errorCount >= 5) {
      newLevel = this.degradationLevels.MODERATE;
    } else if (this.errorCount >= 2) {
      newLevel = this.degradationLevels.LIGHT;
    }
    
    // 基于性能数据
    const performanceData = performanceMonitor.getPerformanceData();
    if (performanceData.length > 0) {
      // 计算最近10次性能数据的平均值
      const recentData = performanceData.slice(-10);
      
      // 检查翻译函数性能
      const translateTextData = recentData.filter(d => d.name === 'translateText');
      if (translateTextData.length > 0) {
        const avgTranslateTime = translateTextData.reduce((sum, d) => sum + d.duration, 0) / translateTextData.length;
        if (avgTranslateTime > this.performanceThresholds.translateText * 2) {
          newLevel = Math.max(newLevel, this.degradationLevels.SEVERE);
        } else if (avgTranslateTime > this.performanceThresholds.translateText) {
          newLevel = Math.max(newLevel, this.degradationLevels.MODERATE);
        }
      }
      
      // 检查高亮函数性能
      const highlightData = recentData.filter(d => d.name === 'highlightTranslatedWords');
      if (highlightData.length > 0) {
        const avgHighlightTime = highlightData.reduce((sum, d) => sum + d.duration, 0) / highlightData.length;
        if (avgHighlightTime > this.performanceThresholds.highlightTranslatedWords * 2) {
          newLevel = Math.max(newLevel, this.degradationLevels.SEVERE);
        } else if (avgHighlightTime > this.performanceThresholds.highlightTranslatedWords) {
          newLevel = Math.max(newLevel, this.degradationLevels.MODERATE);
        }
      }
    }
    
    // 更新降级级别
    if (this.currentLevel !== newLevel) {
      console.warn(`服务降级级别变化: ${this.currentLevel} -> ${newLevel}`);
      this.currentLevel = newLevel;
      this.applyDegradation();
    }
  }
  
  /**
   * 应用降级策略
   */
  applyDegradation() {
    switch (this.currentLevel) {
      case this.degradationLevels.NORMAL:
        // 正常状态：启用所有功能
        window.MAX_HIGHLIGHTS = 1000;
        break;
        
      case this.degradationLevels.LIGHT:
        // 轻度降级：限制高亮数量，减少DOM操作
        window.MAX_HIGHLIGHTS = 500;
        break;
        
      case this.degradationLevels.MODERATE:
        // 中度降级：进一步限制高亮数量，减少AI分析
        window.MAX_HIGHLIGHTS = 200;
        // 减少AI分析频率
        break;
        
      case this.degradationLevels.SEVERE:
        // 重度降级：只保留核心功能，限制高亮数量，关闭非核心功能
        window.MAX_HIGHLIGHTS = 100;
        // 关闭AI分析
        // 减少高亮更新频率
        break;
    }
  }
  
  /**
   * 检查是否允许执行特定功能
   * @param {string} feature - 功能名称
   * @returns {boolean} 是否允许执行
   */
  isFeatureAllowed(feature) {
    switch (feature) {
      case 'aiAnalysis':
        return this.currentLevel < this.degradationLevels.SEVERE;
        
      case 'highlight':
        return this.currentLevel < this.degradationLevels.SEVERE;
        
      case 'detailedTranslation':
        return this.currentLevel < this.degradationLevels.MODERATE;
        
      default:
        return true;
    }
  }
  
  /**
   * 获取当前降级级别
   * @returns {number} 当前降级级别
   */
  getCurrentLevel() {
    return this.currentLevel;
  }
}

// 导出常量和类，供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  // CommonJS 模块系统
  module.exports = { ServiceDegradationManager };
} else if (typeof window !== 'undefined') {
  // 浏览器环境
  window.ServiceDegradationManager = ServiceDegradationManager;
} else if (typeof self !== 'undefined') {
  // Service Worker 环境
  self.ServiceDegradationManager = ServiceDegradationManager;
}