/**
 * Background组件基类，用于Background脚本组件的开发
 * 继承自BaseComponent，但修改了DOM相关方法以适应Background脚本环境
 */
const BaseComponent = require('../../utils/BaseComponent.js');

class BackgroundComponent extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   */
  constructor(props) {
    super(props);
    
    // Background组件无常驻DOM，因此element设置为null
    this.element = null;
    
    // 背景组件特有的事件监听器
    this.backgroundListeners = [];
  }

  /**
   * 注册Chrome扩展事件监听器
   * @param {string} eventName - 事件名称，如'onMessage', 'onInstalled'等
   * @param {Function} callback - 事件回调函数
   */
  registerChromeListener(eventName, callback) {
    const chromeEvent = chrome[eventName];
    if (chromeEvent && typeof chromeEvent.addListener === 'function') {
      chromeEvent.addListener(callback);
      this.backgroundListeners.push({ eventName, callback });
    }
  }

  /**
   * 注册Chrome扩展事件监听器（带有额外参数）
   * @param {string} eventNamespace - 命名空间，如'tabs', 'runtime'等
   * @param {string} eventName - 事件名称，如'onUpdated', 'onMessage'等
   * @param {Function} callback - 事件回调函数
   */
  registerChromeNamespaceListener(eventNamespace, eventName, callback) {
    const chromeNamespace = chrome[eventNamespace];
    if (chromeNamespace && chromeNamespace[eventName] && typeof chromeNamespace[eventName].addListener === 'function') {
      chromeNamespace[eventName].addListener(callback);
      this.backgroundListeners.push({ 
        namespace: eventNamespace, 
        eventName, 
        callback 
      });
    }
  }

  /**
   * 渲染组件
   * @returns {null} - Background组件无常驻DOM，返回null
   */
  render() {
    // Background组件无常驻DOM，返回null
    return null;
  }

  /**
   * 更新组件
   * @param {Object} newProps - 新的组件属性
   */
  update(newProps) {
    if (newProps) {
      this.props = { ...this.props, ...newProps };
    }
    // 子类可以重写此方法来更新组件状态
  }

  /**
   * 销毁组件
   */
  destroy() {
    // 移除所有背景事件监听器
    this.removeChromeListeners();
    
    // 调用父类销毁方法
    super.destroy();
  }

  /**
   * 移除所有Chrome扩展事件监听器
   */
  removeChromeListeners() {
    this.backgroundListeners.forEach(listener => {
      if (listener.namespace) {
        // 命名空间事件
        const chromeNamespace = chrome[listener.namespace];
        if (chromeNamespace && chromeNamespace[listener.eventName] && typeof chromeNamespace[listener.eventName].removeListener === 'function') {
          chromeNamespace[listener.eventName].removeListener(listener.callback);
        }
      } else {
        // 直接事件
        const chromeEvent = chrome[listener.eventName];
        if (chromeEvent && typeof chromeEvent.removeListener === 'function') {
          chromeEvent.removeListener(listener.callback);
        }
      }
    });
    
    // 清空监听器列表
    this.backgroundListeners = [];
  }

  /**
   * 获取存储数据
   * @param {string|Array|Object} keys - 要获取的键
   * @returns {Promise<Object>} - 存储数据
   */
  async getStorageData(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * 设置存储数据
   * @param {Object} data - 要存储的数据
   * @returns {Promise<void>} - 存储结果
   */
  async setStorageData(data) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 发送消息到指定标签页
   * @param {number} tabId - 标签页ID
   * @param {Object} message - 消息内容
   * @param {Object} options - 选项
   * @returns {Promise<Object>} - 响应结果
   */
  async sendMessageToTab(tabId, message, options = {}) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, options, (response) => {
        if (chrome.runtime.lastError) {
          // 忽略因标签页关闭或内容脚本未加载导致的错误
          resolve(null);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * 发送消息到所有标签页
   * @param {Object} message - 消息内容
   */
  async sendMessageToAllTabs(message) {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        await this.sendMessageToTab(tab.id, message);
      }
    }
  }
}

// 导出组件基类
module.exports = BackgroundComponent;