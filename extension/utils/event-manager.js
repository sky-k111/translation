/**
 * 单词翻译助手 - 事件管理模块
 * 负责处理事件委托和防抖节流等事件处理功能
 */

/**
 * 防抖函数
 * 限制函数在一定时间内只能执行一次
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 等待时间（毫秒）
 * @param {boolean} immediate - 是否立即执行
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const context = this;
    const later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

/**
 * 节流函数
 * 限制函数在一定时间内只能执行一次
 * @param {Function} func - 要执行的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function} 节流后的函数
 */
function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 事件委托管理器
 * 用于统一管理所有事件监听，实现更高效的事件委托
 */
class EventDelegateManager {
  constructor() {
    this.eventListeners = new Map(); // 存储事件监听器
    this.delegatedEvents = new Map(); // 存储委托的事件
    this.stats = {
      totalEvents: 0,
      handledEvents: 0,
      delegatedEvents: 0,
      avgProcessingTime: 0,
      totalProcessingTime: 0
    };
  }
  
  /**
   * 添加事件监听器
   * @param {string} eventName - 事件名称
   * @param {Function} handler - 事件处理函数
   * @param {Object} options - 事件选项
   * @param {string} selector - 选择器，用于事件委托
   * @returns {string} 事件监听器ID
   */
  addEventListener(eventName, handler, options = {}, selector = null) {
    const listenerId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (selector) {
      // 事件委托
      this._addDelegatedEventListener(eventName, handler, options, selector, listenerId);
    } else {
      // 普通事件监听
      const listener = {
        id: listenerId,
        handler,
        options,
        element: document
      };
      
      document.addEventListener(eventName, handler, options);
      
      // 存储事件监听器
      if (!this.eventListeners.has(eventName)) {
        this.eventListeners.set(eventName, new Map());
      }
      this.eventListeners.get(eventName).set(listenerId, listener);
    }
    
    return listenerId;
  }
  
  /**
   * 添加委托事件监听器
   * @param {string} eventName - 事件名称
   * @param {Function} handler - 事件处理函数
   * @param {Object} options - 事件选项
   * @param {string} selector - 选择器
   * @param {string} listenerId - 事件监听器ID
   * @private
   */
  _addDelegatedEventListener(eventName, handler, options, selector, listenerId) {
    // 检查是否已经有相同的事件委托
    if (!this.delegatedEvents.has(eventName)) {
      const delegatedHandler = this._createDelegatedHandler(eventName);
      document.addEventListener(eventName, delegatedHandler, options);
      this.delegatedEvents.set(eventName, {
        handler: delegatedHandler,
        listeners: new Map()
      });
      this.stats.delegatedEvents++;
    }
    
    // 添加事件监听器
    const delegatedEvent = this.delegatedEvents.get(eventName);
    delegatedEvent.listeners.set(listenerId, {
      id: listenerId,
      handler,
      selector,
      options
    });
  }
  
  /**
   * 创建委托事件处理函数
   * @param {string} eventName - 事件名称
   * @returns {Function} 委托事件处理函数
   * @private
   */
  _createDelegatedHandler(eventName) {
    return (event) => {
      const startTime = Date.now();
      this.stats.totalEvents++;
      
      const delegatedEvent = this.delegatedEvents.get(eventName);
      if (!delegatedEvent) return;
      
      // 遍历所有监听器，找到匹配的选择器
      for (const [listenerId, listener] of delegatedEvent.listeners.entries()) {
        const target = event.target;
        if (target.matches(listener.selector) || target.closest(listener.selector)) {
          // 执行事件处理函数
          listener.handler.call(target, event);
          this.stats.handledEvents++;
        }
      }
      
      // 更新统计信息
      const processingTime = Date.now() - startTime;
      this.stats.totalProcessingTime += processingTime;
      this.stats.avgProcessingTime = this.stats.totalEvents > 0 
        ? this.stats.totalProcessingTime / this.stats.totalEvents 
        : 0;
    };
  }
  
  /**
   * 移除事件监听器
   * @param {string} eventName - 事件名称
   * @param {string} listenerId - 事件监听器ID
   */
  removeEventListener(eventName, listenerId) {
    // 检查是否是委托事件
    if (this.delegatedEvents.has(eventName)) {
      const delegatedEvent = this.delegatedEvents.get(eventName);
      if (delegatedEvent.listeners.has(listenerId)) {
        delegatedEvent.listeners.delete(listenerId);
        
        // 如果没有监听器了，移除委托事件
        if (delegatedEvent.listeners.size === 0) {
          document.removeEventListener(eventName, delegatedEvent.handler);
          this.delegatedEvents.delete(eventName);
        }
      }
    }
    
    // 检查是否是普通事件
    if (this.eventListeners.has(eventName)) {
      const listeners = this.eventListeners.get(eventName);
      if (listeners.has(listenerId)) {
        const listener = listeners.get(listenerId);
        document.removeEventListener(eventName, listener.handler, listener.options);
        listeners.delete(listenerId);
        
        // 如果没有监听器了，移除事件
        if (listeners.size === 0) {
          this.eventListeners.delete(eventName);
        }
      }
    }
  }
  
  /**
   * 移除所有事件监听器
   */
  removeAllEventListeners() {
    // 移除普通事件监听器
    for (const [eventName, listeners] of this.eventListeners.entries()) {
      for (const [listenerId, listener] of listeners.entries()) {
        document.removeEventListener(eventName, listener.handler, listener.options);
      }
    }
    this.eventListeners.clear();
    
    // 移除委托事件监听器
    for (const [eventName, delegatedEvent] of this.delegatedEvents.entries()) {
      document.removeEventListener(eventName, delegatedEvent.handler);
    }
    this.delegatedEvents.clear();
    
    // 重置统计信息
    this.resetStats();
  }
  
  /**
   * 初始化事件管理器（用于模块管理器统一调用）
   */
  async init() {
    // 事件管理器已经在构造函数中初始化，这里只需要返回一个成功的Promise
    return Promise.resolve('事件管理器初始化完成');
  }
  
  /**
   * 获取事件统计信息
   * @returns {Object} 事件统计信息
   */
  getStats() {
    return {
      ...this.stats,
      totalListeners: this._getTotalListeners(),
      totalDelegatedEvents: this.delegatedEvents.size
    };
  }
  
  /**
   * 获取总监听器数量
   * @returns {number} 总监听器数量
   * @private
   */
  _getTotalListeners() {
    let count = 0;
    
    // 统计普通事件监听器
    for (const listeners of this.eventListeners.values()) {
      count += listeners.size;
    }
    
    // 统计委托事件监听器
    for (const delegatedEvent of this.delegatedEvents.values()) {
      count += delegatedEvent.listeners.size;
    }
    
    return count;
  }
  
  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      totalEvents: 0,
      handledEvents: 0,
      delegatedEvents: 0,
      avgProcessingTime: 0,
      totalProcessingTime: 0
    };
  }
}

// 导出常量和类，供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  // CommonJS 模块系统
  module.exports = { EventDelegateManager, debounce, throttle };
} else if (typeof window !== 'undefined') {
  // 浏览器环境
  window.EventDelegateManager = EventDelegateManager;
  window.debounce = debounce;
  window.throttle = throttle;
} else if (typeof self !== 'undefined') {
  // Service Worker 环境
  self.EventDelegateManager = EventDelegateManager;
  self.debounce = debounce;
  self.throttle = throttle;
}
