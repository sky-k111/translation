/**
 * 高亮管理器 - 统一管理高亮功能
 * 负责协调虚拟化高亮组件与现有系统的集成
 */

// 使用全局变量，避免 require 问题
const VirtualizedTranslationHighlight = window.VirtualizedTranslationHighlight;

class HighlightManager {
  constructor() {
    this.virtualHighlight = null;
    this.isEnabled = true;
    this.performanceMode = 'auto'; // auto, high-performance, quality
    this.lastHighlightTime = 0;
    this.highlightQueue = [];
    this.isProcessing = false;
    
    // 性能配置
    this.performanceConfig = {
      'high-performance': {
        maxHighlights: 500,
        batchSize: 100,
        enableVirtualization: true,
        debounceDelay: 50
      },
      'quality': {
        maxHighlights: 2000,
        batchSize: 25,
        enableVirtualization: false,
        debounceDelay: 200
      },
      'auto': {
        maxHighlights: 1000,
        batchSize: 50,
        enableVirtualization: true,
        debounceDelay: 100
      }
    };
    
    this.init();
  }

  /**
   * 初始化高亮管理器
   */
  init() {
    // 检测设备性能并设置模式
    this.detectPerformanceMode();
    
    // 创建虚拟化高亮组件
    this.createVirtualHighlight();
    
    // 监听性能模式变化
    this.bindEvents();
  }

  /**
   * 检测性能模式
   */
  detectPerformanceMode() {
    // 基于设备性能自动选择模式
    const memory = performance.memory;
    const connection = navigator.connection;
    
    if (memory && memory.usedJSHeapSize > 100 * 1024 * 1024) { // 100MB
      this.performanceMode = 'high-performance';
    } else if (connection && connection.effectiveType && connection.effectiveType.includes('2g')) {
      this.performanceMode = 'high-performance';
    } else {
      this.performanceMode = 'auto';
    }
    
    console.log(`高亮管理器: 使用 ${this.performanceMode} 性能模式`);
  }

  /**
   * 创建虚拟化高亮组件
   */
  createVirtualHighlight() {
    const config = this.performanceConfig[this.performanceMode];
    
    this.virtualHighlight = new VirtualizedTranslationHighlight({
      onHighlightClick: this.handleHighlightClick.bind(this),
      ...config
    });
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });

    // 监听内存压力
    if ('memory' in performance) {
      setInterval(() => {
        const usage = performance.memory.usedJSHeapSize;
        if (usage > 80 * 1024 * 1024) { // 80MB
          this.switchToHighPerformanceMode();
        }
      }, 30000);
    }
  }

  /**
   * 高亮翻译单词 - 主入口
   */
  async highlightTranslatedWords(words, targetRoots = null) {
    if (!this.isEnabled) return;
    
    const now = Date.now();
    
    // 防抖处理
    if (now - this.lastHighlightTime < this.performanceConfig[this.performanceMode].debounceDelay) {
      this.queueHighlight(words, targetRoots);
      return;
    }
    
    this.lastHighlightTime = now;
    
    try {
      await this.processHighlight(words, targetRoots);
    } catch (error) {
      console.error('高亮处理失败:', error);
    }
  }

  /**
   * 队列化高亮请求
   */
  queueHighlight(words, targetRoots) {
    this.highlightQueue.push({ words, targetRoots, timestamp: Date.now() });
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * 处理队列
   */
  async processQueue() {
    this.isProcessing = true;
    
    while (this.highlightQueue.length > 0) {
      const { words, targetRoots } = this.highlightQueue.shift();
      
      try {
        await this.processHighlight(words, targetRoots);
      } catch (error) {
        console.error('队列处理失败:', error);
      }
      
      // 让出控制权
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    this.isProcessing = false;
  }

  /**
   * 处理高亮
   */
  async processHighlight(words, targetRoots) {
    if (!this.virtualHighlight) {
      await this.createVirtualHighlight();
    }
    
    await this.virtualHighlight.highlightTranslatedWords(words, targetRoots);
  }

  /**
   * 处理高亮点击事件
   */
  async handleHighlightClick(eventData) {
    // 触发原有的点击处理逻辑
    if (window.handleHighlightClick) {
      // 模拟原有的点击事件
      const mockEvent = {
        target: eventData.element,
        preventDefault: () => {},
        stopPropagation: () => {}
      };
      
      await window.handleHighlightClick(mockEvent);
    }
  }

  /**
   * 切换到高性能模式
   */
  switchToHighPerformanceMode() {
    if (this.performanceMode === 'high-performance') return;
    
    console.log('切换到高性能模式');
    this.performanceMode = 'high-performance';
    
    // 重新创建组件
    if (this.virtualHighlight) {
      this.virtualHighlight.destroy();
    }
    this.createVirtualHighlight();
  }

  /**
   * 暂停高亮功能
   */
  pause() {
    this.isEnabled = false;
    if (this.virtualHighlight) {
      this.virtualHighlight.destroy();
      this.virtualHighlight = null;
    }
  }

  /**
   * 恢复高亮功能
   */
  resume() {
    this.isEnabled = true;
    if (!this.virtualHighlight) {
      this.createVirtualHighlight();
    }
  }

  /**
   * 重新高亮
   */
  async rehighlight() {
    if (this.virtualHighlight) {
      await this.virtualHighlight.rehighlight();
    }
  }

  /**
   * 移除所有高亮
   */
  removeAllHighlights() {
    if (this.virtualHighlight) {
      this.virtualHighlight.removeAllHighlights();
    }
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    if (!this.virtualHighlight) return null;
    
    return {
      mode: this.performanceMode,
      config: this.performanceConfig[this.performanceMode],
      metrics: this.virtualHighlight.performanceMetrics,
      queueLength: this.highlightQueue.length
    };
  }

  /**
   * 设置性能模式
   */
  setPerformanceMode(mode) {
    if (!this.performanceConfig[mode]) {
      console.error(`未知的性能模式: ${mode}`);
      return;
    }
    
    this.performanceMode = mode;
    
    // 重新创建组件
    if (this.virtualHighlight) {
      this.virtualHighlight.destroy();
    }
    this.createVirtualHighlight();
    
    console.log(`性能模式已设置为: ${mode}`);
  }

  /**
   * 销毁管理器
   */
  destroy() {
    if (this.virtualHighlight) {
      this.virtualHighlight.destroy();
    }
    
    this.highlightQueue = [];
    this.isProcessing = false;
    this.isEnabled = false;
  }
}

// 创建全局实例
window.highlightManager = new HighlightManager();

// 导出管理器
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HighlightManager;
}

// 同时导出到全局变量
if (typeof window !== 'undefined') {
  window.HighlightManager = HighlightManager;
}

