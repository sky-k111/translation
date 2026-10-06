/**
 * Content组件基类，所有Content脚本组件都继承自该类
 * 提供Content组件的基础功能，包括DOM监听、消息通信等
 */
const BaseComponent = require('../../utils/BaseComponent.js');
const styleManager = require('../../utils/style-manager.js');
const eventBus = require('../../utils/event-bus.js');

class ContentComponent extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} props - 组件属性
   */
  constructor(props) {
    super(props);
    
    // Content脚本特有属性
    this.domObserver = null;
    this.messageListeners = [];
  }

  /**
   * 初始化Content组件
   */
  init() {
    this.registerStyle();
    this.createObserver();
    this.bindMessages();
  }

  /**
   * 创建DOM观察者，用于监听页面DOM变化
   */
  createObserver() {
    // 子类可以重写此方法来创建特定的DOM观察者
  }

  /**
   * 绑定Chrome消息监听
   */
  bindMessages() {
    // 子类可以重写此方法来绑定特定的消息监听
  }

  /**
   * 发送消息到后台脚本
   * @param {Object} message - 要发送的消息
   * @returns {Promise} - 消息发送的Promise
   */
  sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * 注册消息监听器
   * @param {Function} callback - 消息回调函数
   */
  registerMessageListener(callback) {
    const listener = (message, sender, sendResponse) => {
      callback(message, sender, sendResponse);
    };
    
    chrome.runtime.onMessage.addListener(listener);
    this.messageListeners.push(listener);
  }

  /**
   * 解绑所有消息监听器
   */
  unbindMessages() {
    this.messageListeners.forEach(listener => {
      chrome.runtime.onMessage.removeListener(listener);
    });
    this.messageListeners = [];
  }

  /**
   * 获取当前选中的文本
   * @returns {string} - 选中的文本
   */
  getSelectedText() {
    const selection = window.getSelection();
    return selection.toString().trim();
  }

  /**
   * 获取当前选中的文本范围
   * @returns {Range|null} - 选中的文本范围
   */
  getSelectedRange() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      return selection.getRangeAt(0);
    }
    return null;
  }

  /**
   * 销毁组件
   */
  destroy() {
    super.destroy();
    
    // 取消DOM观察
    if (this.domObserver) {
      this.domObserver.disconnect();
      this.domObserver = null;
    }
    
    // 解绑消息监听器
    this.unbindMessages();
  }
}

// 导出Content组件基类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContentComponent;
}

// 同时导出到全局变量
if (typeof window !== 'undefined') {
  window.ContentComponent = ContentComponent;
}

