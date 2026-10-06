/**
 * 事件总线，用于组件间的通信
 * 采用单例模式，确保整个应用只有一个事件总线实例
 */
class EventBus {
  constructor() {
    if (EventBus.instance) {
      return EventBus.instance;
    }
    
    this.events = new Map();
    EventBus.instance = this;
  }

  /**
   * 订阅事件
   * @param {string} eventName - 事件名称
   * @param {Function} callback - 事件回调函数
   * @param {Object} [context] - 回调函数的上下文
   * @returns {Function} - 取消订阅的函数
   */
  on(eventName, callback, context) {
    if (typeof eventName !== 'string') {
      throw new Error('Event name must be a string');
    }
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }
    
    const listener = {
      callback,
      context: context || null
    };
    
    this.events.get(eventName).push(listener);
    
    // 返回取消订阅的函数
    return () => {
      this.off(eventName, callback);
    };
  }

  /**
   * 订阅事件，只触发一次
   * @param {string} eventName - 事件名称
   * @param {Function} callback - 事件回调函数
   * @param {Object} [context] - 回调函数的上下文
   */
  once(eventName, callback, context) {
    const onceCallback = (...args) => {
      callback.apply(context, args);
      this.off(eventName, onceCallback);
    };
    
    this.on(eventName, onceCallback, context);
  }

  /**
   * 发布事件
   * @param {string} eventName - 事件名称
   * @param {...*} args - 事件参数
   */
  emit(eventName, ...args) {
    if (typeof eventName !== 'string') {
      throw new Error('Event name must be a string');
    }
    
    if (this.events.has(eventName)) {
      // 创建监听器数组的副本，防止在触发回调时修改原数组
      const listeners = [...this.events.get(eventName)];
      
      listeners.forEach(listener => {
        try {
          listener.callback.apply(listener.context, args);
        } catch (error) {
          console.error(`Error in event listener for "${eventName}":`, error);
        }
      });
    }
  }

  /**
   * 取消订阅事件
   * @param {string} eventName - 事件名称
   * @param {Function} [callback] - 事件回调函数，如果不提供则取消该事件的所有订阅
   */
  off(eventName, callback) {
    if (typeof eventName !== 'string') {
      throw new Error('Event name must be a string');
    }
    
    if (this.events.has(eventName)) {
      if (callback) {
        // 只取消指定回调的订阅
        const listeners = this.events.get(eventName);
        const filteredListeners = listeners.filter(listener => listener.callback !== callback);
        
        if (filteredListeners.length > 0) {
          this.events.set(eventName, filteredListeners);
        } else {
          this.events.delete(eventName);
        }
      } else {
        // 取消该事件的所有订阅
        this.events.delete(eventName);
      }
    }
  }

  /**
   * 取消所有事件的订阅
   */
  clear() {
    this.events.clear();
  }

  /**
   * 获取指定事件的订阅数量
   * @param {string} eventName - 事件名称
   * @returns {number} - 订阅数量
   */
  getListenerCount(eventName) {
    if (typeof eventName !== 'string') {
      throw new Error('Event name must be a string');
    }
    
    return this.events.has(eventName) ? this.events.get(eventName).length : 0;
  }

  /**
   * 获取所有事件名称
   * @returns {Array} - 事件名称数组
   */
  getAllEventNames() {
    return Array.from(this.events.keys());
  }
}

// 创建单例实例
const eventBus = new EventBus();

// 导出事件总线
if (typeof module !== 'undefined' && module.exports) {
  module.exports = eventBus;
} else if (typeof window !== 'undefined') {
  window.eventBus = eventBus;
}