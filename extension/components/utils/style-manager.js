/**
 * 样式管理器
 * 用于按需加载CSS文件，减少初始加载体积
 * 
 * 功能：
 * - 按需加载CSS文件
 * - 避免重复加载
 * - 支持批量加载
 * - 加载状态追踪
 */

class StyleManager {
  constructor() {
    this.loadedStyles = new Set();
    this.loadingStyles = new Map(); // style name -> Promise
    this.styleCache = new Map();
    this.stats = {
      totalLoaded: 0,
      totalFailed: 0,
      loadTimes: []
    };
    
    // 样式文件映射
    this.styleMap = {
      'animations': 'extension/components/styles/animations.css',
      'variables': 'extension/components/styles/variables.css',
      'reset': 'extension/components/styles/reset.css',
      'utils': 'extension/components/styles/utils.css'
    };
    
    console.log('🎨 样式管理器已初始化');
  }
  
  /**
   * 加载单个样式文件
   * @param {string} styleName - 样式名称
   * @returns {Promise} 加载Promise
   */
  async loadStyle(styleName) {
    // 如果已加载，直接返回
    if (this.loadedStyles.has(styleName)) {
      console.log(`✅ 样式已加载: ${styleName}`);
      return Promise.resolve();
    }
    
    // 如果正在加载，返回现有Promise
    if (this.loadingStyles.has(styleName)) {
      console.log(`⏳ 样式加载中: ${styleName}`);
      return this.loadingStyles.get(styleName);
    }
    
    // 获取样式路径
    const path = this.styleMap[styleName];
    if (!path) {
      console.warn(`⚠️ 未知的样式名称: ${styleName}`);
      return Promise.reject(new Error(`Unknown style: ${styleName}`));
    }
    
    // 创建加载Promise
    const loadPromise = this._loadStyleCore(styleName, path);
    this.loadingStyles.set(styleName, loadPromise);
    
    return loadPromise;
  }
  
  /**
   * 核心样式加载逻辑
   * @private
   */
  async _loadStyleCore(styleName, path) {
    const startTime = performance.now();
    
    try {
      // 验证扩展上下文
      if (!chrome.runtime || !chrome.runtime.id) {
        throw new Error('Extension context is invalid');
      }
      
      // 创建link元素
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL(path);
      link.dataset.styleName = styleName;
      
      // 等待加载完成
      await new Promise((resolve, reject) => {
        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`Failed to load style: ${styleName}`));
        
        // 添加到DOM
        (document.head || document.documentElement).appendChild(link);
      });
      
      // 记录加载成功
      this.loadedStyles.add(styleName);
      this.loadingStyles.delete(styleName);
      this.styleCache.set(styleName, link);
      
      const loadTime = performance.now() - startTime;
      this.stats.totalLoaded++;
      this.stats.loadTimes.push(loadTime);
      
      console.log(`✅ 样式加载成功: ${styleName} (${loadTime.toFixed(0)}ms)`);
      
    } catch (error) {
      this.loadingStyles.delete(styleName);
      this.stats.totalFailed++;
      
      console.error(`❌ 样式加载失败: ${styleName}`, error);
      throw error;
    }
  }
  
  /**
   * 批量加载样式
   * @param {Array<string>} styleNames - 样式名称数组
   * @returns {Promise} 加载Promise
   */
  async loadStyles(styleNames) {
    console.log(`📦 批量加载样式: ${styleNames.join(', ')}`);
    
    const promises = styleNames.map(name => this.loadStyle(name));
    const results = await Promise.allSettled(promises);
    
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`✅ 批量加载完成: ${succeeded}成功, ${failed}失败`);
    
    return results;
  }
  
  /**
   * 根据组件需求加载样式
   * @param {Array<Object>} components - 组件数组
   * @returns {Promise} 加载Promise
   */
  async loadRequiredStyles(components) {
    const requiredStyles = new Set();
    
    components.forEach(comp => {
      if (comp.requiresAnimations) requiredStyles.add('animations');
      if (comp.requiresVariables) requiredStyles.add('variables');
      if (comp.requiresReset) requiredStyles.add('reset');
      if (comp.requiresUtils) requiredStyles.add('utils');
    });
    
    if (requiredStyles.size === 0) {
      console.log('ℹ️ 无需加载额外样式');
      return Promise.resolve();
    }
    
    return this.loadStyles(Array.from(requiredStyles));
  }
  
  /**
   * 卸载样式
   * @param {string} styleName - 样式名称
   */
  unloadStyle(styleName) {
    if (!this.loadedStyles.has(styleName)) {
      console.warn(`⚠️ 样式未加载: ${styleName}`);
      return;
    }
    
    const link = this.styleCache.get(styleName);
    if (link && link.parentNode) {
      link.parentNode.removeChild(link);
    }
    
    this.loadedStyles.delete(styleName);
    this.styleCache.delete(styleName);
    
    console.log(`🗑️ 样式已卸载: ${styleName}`);
  }
  
  /**
   * 检查样式是否已加载
   * @param {string} styleName - 样式名称
   * @returns {boolean} 是否已加载
   */
  isLoaded(styleName) {
    return this.loadedStyles.has(styleName);
  }
  
  /**
   * 获取加载统计
   * @returns {Object} 统计信息
   */
  getStats() {
    const avgLoadTime = this.stats.loadTimes.length > 0
      ? this.stats.loadTimes.reduce((a, b) => a + b, 0) / this.stats.loadTimes.length
      : 0;
    
    return {
      totalLoaded: this.stats.totalLoaded,
      totalFailed: this.stats.totalFailed,
      avgLoadTime: avgLoadTime.toFixed(2) + 'ms',
      loadedStyles: Array.from(this.loadedStyles),
      loadingStyles: Array.from(this.loadingStyles.keys())
    };
  }
  
  /**
   * 重置统计
   */
  resetStats() {
    this.stats = {
      totalLoaded: 0,
      totalFailed: 0,
      loadTimes: []
    };
  }
}

// 导出全局实例
if (typeof window !== 'undefined') {
  window.StyleManager = StyleManager;
  window.styleManager = new StyleManager();
}
